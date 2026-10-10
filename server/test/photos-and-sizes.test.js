import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import sharp from "sharp";
import { mockClient } from "aws-sdk-client-mock";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createApp,
  createUser,
  tokenFor,
  stubStripe,
  testPhoto,
} from "./helpers.js";
import { optimizePhoto, ImageError, MAX_PHOTO_SIZE } from "../src/images.js";
import { parseSizeStock } from "../src/productFields.js";

const s3Mock = mockClient(S3Client);

// A large, detailed photo saved at high quality, like a phone camera's
// (about 5 MB at 3000×2000).
const bigPhoto = (width = 3000, height = 2000) => {
  const pixels = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 2654435761) >>> 24;
  return sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();
};

describe("optimizePhoto", () => {
  it("shrinks large photos to 1600px on the longest side as a smaller JPEG", async () => {
    const original = await bigPhoto();
    const { buffer, mimetype } = await optimizePhoto(original);
    const meta = await sharp(buffer).metadata();
    assert.equal(mimetype, "image/jpeg");
    assert.equal(meta.format, "jpeg");
    assert.equal(Math.max(meta.width, meta.height), MAX_PHOTO_SIZE);
    assert.deepEqual([meta.width, meta.height], [1600, 1067]); // shape kept
    assert.ok(original.length > 4_000_000, `original ${original.length}`);
    assert.ok(buffer.length < original.length / 10, `${buffer.length} vs ${original.length}`);
  });

  it("never enlarges small photos", async () => {
    const { buffer } = await optimizePhoto(await testPhoto({ width: 400, height: 300 }));
    const meta = await sharp(buffer).metadata();
    assert.deepEqual([meta.width, meta.height], [400, 300]);
  });

  it("applies the camera's rotation and removes metadata such as location", async () => {
    // A landscape photo the camera marked "rotate 90°", with EXIF data.
    const sideways = await sharp(await testPhoto({ width: 200, height: 100, format: "jpeg" }))
      .withMetadata({ orientation: 6, exif: { IFD0: { Artist: "Phone camera" } } })
      .jpeg()
      .toBuffer();
    assert.ok((await sharp(sideways).metadata()).exif);

    const meta = await sharp((await optimizePhoto(sideways)).buffer).metadata();
    assert.deepEqual([meta.width, meta.height], [100, 200]);
    assert.equal(meta.orientation, undefined);
    assert.equal(meta.exif, undefined);
  });

  it("gives transparent images a white background", async () => {
    const transparent = await sharp({
      create: { width: 20, height: 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
    const { buffer } = await optimizePhoto(transparent);
    const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 3);
    assert.ok(data[0] > 250 && data[1] > 250 && data[2] > 250);
  });

  it("rejects files that aren't images", async () => {
    await assert.rejects(optimizePhoto(Buffer.from("not a photo")), ImageError);
  });
});

describe("parseSizeStock", () => {
  const sizes = ["S", "M", "L"];

  it("reads stock for every size, in the size order", () => {
    assert.deepEqual(parseSizeStock('{"L": 1, "S": "3", "M": 0}', sizes), {
      sizeStock: [
        { size: "S", inStock: 3 },
        { size: "M", inStock: 0 },
        { size: "L", inStock: 1 },
      ],
    });
  });

  it("treats empty input as 'not tracked per size'", () => {
    assert.deepEqual(parseSizeStock("", sizes), { sizeStock: [] });
    assert.deepEqual(parseSizeStock("{}", sizes), { sizeStock: [] });
  });

  it("explains what's wrong", () => {
    assert.match(parseSizeStock('{"S": 1, "M": 2}', sizes).error, /missing: L/);
    assert.match(parseSizeStock('{"S":1,"M":1,"L":1,"XL":1}', sizes).error, /doesn't have: XL/);
    assert.match(parseSizeStock('{"S": -1, "M": 1, "L": 1}', sizes).error, /size S/);
    assert.match(parseSizeStock('{"S": 1.5, "M": 1, "L": 1}', sizes).error, /size S/);
    assert.match(parseSizeStock('{"S": "", "M": 1, "L": 1}', sizes).error, /size S/);
    assert.match(parseSizeStock("[1, 2]", sizes).error, /isn't valid/);
    assert.match(parseSizeStock("{oops", sizes).error, /isn't valid/);
    assert.match(parseSizeStock('{"__proto__": 1}', sizes).error, /doesn't have/);
  });
});

describe("product photos and stock per size", () => {
  let app;
  let Product;
  let Order;
  let fake;
  let adminToken;
  let photo;

  before(async () => {
    await setupDatabase();
    fake = await stubStripe();
    app = await createApp();
    ({ default: Product } = await import("../src/models/Product.js"));
    ({ default: Order } = await import("../src/models/Order.js"));
    photo = await testPhoto();
  });

  after(teardownDatabase);

  beforeEach(async () => {
    await clearDatabase();
    fake.reset();
    s3Mock.reset();
    s3Mock.on(PutObjectCommand).resolves({});
    await createUser({ email: "admin@example.com", isAdmin: true });
    adminToken = tokenFor("admin@example.com");
  });

  const uploads = () => s3Mock.commandCalls(PutObjectCommand).map((c) => c.args[0].input);

  const upload = (fields = {}) => {
    const req = request(app)
      .post("/products/upload")
      .set("Authorization", `Bearer ${adminToken}`)
      .field("title", fields.title ?? "Linen Shirt")
      .field("description", "Breathable linen")
      .field("category", "Men")
      .field("size", fields.size ?? "S, M, L")
      .field("color", "White")
      .field("price", "80");
    if (fields.inStock !== undefined) req.field("inStock", fields.inStock);
    if (fields.sizeStock !== undefined) req.field("sizeStock", fields.sizeStock);
    return req;
  };

  const edit = (id) =>
    request(app).put(`/products/${id}`).set("Authorization", `Bearer ${adminToken}`);

  describe("uploading", () => {
    it("stores every photo compressed, the first as the main photo", async () => {
      const res = await upload({ inStock: "5" })
        .attach("images", await bigPhoto(2400, 3200), "front.jpg")
        .attach("images", photo, "back.png")
        .attach("images", photo, "detail.png");
      assert.equal(res.status, 200, res.body.error);

      const sent = uploads();
      assert.equal(sent.length, 3);
      assert.deepEqual(res.body.data.images, sent.map((u) => u.Key));
      assert.equal(res.body.data.image, sent[0].Key);
      for (const u of sent) {
        assert.equal(u.ContentType, "image/jpeg");
        assert.deepEqual([...u.Body.subarray(0, 2)], [0xff, 0xd8]); // JPEG
      }
      const meta = await sharp(sent[0].Body).metadata();
      assert.deepEqual([meta.width, meta.height], [1200, 1600]);
    });

    it("still accepts the older single 'image' field", async () => {
      const res = await upload({ inStock: "5" }).attach("image", photo, "a.png");
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data.images, [res.body.data.image]);
    });

    it("rejects a file that isn't a photo before uploading anything", async () => {
      const res = await upload({ inStock: "5" })
        .attach("images", photo, "good.png")
        .attach("images", Buffer.from("%PDF-1.4 not a photo"), "menu.pdf");
      assert.equal(res.status, 400);
      assert.match(res.body.error, /isn't a supported photo/);
      assert.equal(uploads().length, 0);
      assert.equal(await Product.countDocuments(), 0);
    });

    it("allows at most 8 photos", async () => {
      let req = upload({ inStock: "5" });
      for (let i = 0; i < 9; i++) req = req.attach("images", photo, `p${i}.png`);
      const res = await req;
      assert.equal(res.status, 400);
      assert.equal(res.body.error, "A product can have at most 8 photos");
    });

    it("rejects photos over 20 MB with a clear message", async () => {
      const res = await upload({ inStock: "5" }).attach(
        "images",
        Buffer.alloc(21 * 1024 * 1024),
        "huge.png"
      );
      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Each photo must be under 20 MB");
    });

    it("saves stock per size and sets the total", async () => {
      const res = await upload({ sizeStock: JSON.stringify({ S: 2, M: 0, L: 5 }), inStock: "99" })
        .attach("images", photo, "a.png");
      assert.equal(res.status, 200, res.body.error);
      assert.deepEqual(
        res.body.data.sizeStock.map(({ size, inStock }) => [size, inStock]),
        [["S", 2], ["M", 0], ["L", 5]]
      );
      assert.equal(res.body.data.inStock, 7); // the total, not the 99 sent
    });

    it("explains a missing size's stock", async () => {
      const res = await upload({ sizeStock: JSON.stringify({ S: 2, M: 1 }) }).attach(
        "images",
        photo,
        "a.png"
      );
      assert.equal(res.status, 400);
      assert.equal(res.body.error, "Enter the stock for every size (missing: L)");
      assert.equal(uploads().length, 0);
    });
  });

  describe("editing photos", () => {
    let shirt;
    beforeEach(async () => {
      shirt = await Product.create({
        title: "Linen Shirt",
        category: ["Men"],
        price: 80,
        image: "a",
        images: ["a", "b", "c"],
      });
    });

    it("reorders and removes photos, adding unlisted new ones at the end", async () => {
      const res = await edit(shirt.id)
        .field("photoOrder", JSON.stringify(["c", "a"]))
        .attach("images", photo, "new.png");
      assert.equal(res.status, 200, res.body.error);
      const [added] = uploads().map((u) => u.Key);
      assert.deepEqual(res.body.data.images, ["c", "a", added]);
      assert.equal(res.body.data.image, "c");
    });

    it("can make a new photo the main photo", async () => {
      const res = await edit(shirt.id)
        .field("photoOrder", JSON.stringify(["new:1", "b", "new:0"]))
        .attach("images", photo, "first-new.png")
        .attach("images", photo, "second-new.png");
      assert.equal(res.status, 200, res.body.error);
      const [first, second] = uploads().map((u) => u.Key);
      assert.deepEqual(res.body.data.images, [second, "b", first]);
      assert.equal(res.body.data.image, second);
    });

    it("keeps every photo when only new ones are added", async () => {
      const res = await edit(shirt.id).attach("images", photo, "new.png");
      assert.deepEqual(res.body.data.images.slice(0, 3), ["a", "b", "c"]);
      assert.equal(res.body.data.images.length, 4);
    });

    it("replaces the main photo with the older single 'image' field", async () => {
      const res = await edit(shirt.id).attach("image", photo, "main.png");
      const [main] = uploads().map((u) => u.Key);
      assert.deepEqual(res.body.data.images, [main, "b", "c"]);
      assert.equal(res.body.data.image, main);
    });

    it("leaves photos alone when none are sent", async () => {
      const res = await edit(shirt.id).field("title", "Linen Shirt II");
      assert.deepEqual(res.body.data.images, ["a", "b", "c"]);
      assert.equal(uploads().length, 0);
    });

    it("refuses another product's photo, no photos at all, or more than 8", async () => {
      const foreign = await edit(shirt.id).field("photoOrder", JSON.stringify(["a", "evil"]));
      assert.equal(foreign.status, 400);
      assert.equal(foreign.body.error, "Only the product's own photos can be kept");

      const none = await edit(shirt.id).field("photoOrder", "[]");
      assert.equal(none.status, 400);
      assert.equal(none.body.error, "A product needs at least one photo");

      // "new:5" refers to a photo that wasn't sent.
      const missing = await edit(shirt.id)
        .field("photoOrder", JSON.stringify(["a", "new:5"]))
        .attach("images", photo, "only.png");
      assert.equal(missing.status, 400);

      const invalid = await edit(shirt.id).field("photoOrder", "not json");
      assert.equal(invalid.body.error, "The photo order isn't valid");

      let tooMany = edit(shirt.id);
      for (let i = 0; i < 6; i++) tooMany = tooMany.attach("images", photo, `p${i}.png`);
      const res = await tooMany;
      assert.equal(res.status, 400);
      assert.equal(res.body.error, "A product can have at most 8 photos");
      assert.equal(uploads().length, 0);

      assert.deepEqual((await Product.findById(shirt.id)).images, ["a", "b", "c"]);
    });

    it("works for older products that only have a main photo", async () => {
      const old = await Product.create({ title: "Old", category: ["Men"], price: 10, image: "old" });
      const res = await edit(old.id)
        .field("photoOrder", JSON.stringify(["old"]))
        .attach("images", photo, "new.png");
      assert.equal(res.status, 200, res.body.error);
      assert.equal(res.body.data.images.length, 2);
      assert.equal(res.body.data.images[0], "old");
    });
  });

  describe("editing stock per size", () => {
    let shirt;
    beforeEach(async () => {
      shirt = await Product.create({
        title: "Linen Shirt",
        category: ["Men"],
        price: 80,
        image: "a",
        size: ["S", "M"],
        inStock: 3,
        sizeStock: [
          { size: "S", inStock: 1 },
          { size: "M", inStock: 2 },
        ],
      });
    });

    it("updates each size and the total", async () => {
      const res = await edit(shirt.id).field("sizeStock", JSON.stringify({ S: 4, M: 6 }));
      assert.equal(res.body.data.inStock, 10);
      assert.deepEqual(res.body.data.sizeStock.map((s) => s.inStock), [4, 6]);
    });

    it("keeps stock for remaining sizes when sizes change, new sizes starting at 0", async () => {
      const res = await edit(shirt.id).field("size", "M, L");
      assert.deepEqual(
        res.body.data.sizeStock.map(({ size, inStock }) => [size, inStock]),
        [["M", 2], ["L", 0]]
      );
      assert.equal(res.body.data.inStock, 2);
    });

    it("keeps the total equal to the sizes even if a total is sent", async () => {
      const res = await edit(shirt.id).field("inStock", "50");
      assert.equal(res.body.data.inStock, 3);
    });

    it("switches back to stock for the whole product when sent empty", async () => {
      const res = await edit(shirt.id).field("sizeStock", "").field("inStock", "8");
      assert.deepEqual(res.body.data.sizeStock, []);
      assert.equal(res.body.data.inStock, 8);
    });
  });

  describe("checkout, payment and cancelling with stock per size", () => {
    let shirt;
    beforeEach(async () => {
      shirt = await Product.create({
        title: "Linen Shirt",
        category: ["Men"],
        price: 80,
        size: ["S", "M"],
        inStock: 3,
        sizeStock: [
          { size: "S", inStock: 0 },
          { size: "M", inStock: 3 },
        ],
      });
    });

    const checkout = (items) =>
      request(app).post("/checkout/create-checkout-session").send({ items });

    const pay = (sessionId) => {
      const { payload, signature } = fake.signedWebhook({
        id: "evt",
        type: "checkout.session.completed",
        data: { object: { id: sessionId, mode: "payment", payment_status: "paid" } },
      });
      return request(app)
        .post("/checkout/webhook")
        .set("Content-Type", "application/json")
        .set("Stripe-Signature", signature)
        .send(payload);
    };

    const stock = async () => {
      const p = await Product.findById(shirt.id);
      return [p.inStock, ...p.sizeStock.map((s) => s.inStock)];
    };

    it("checks the chosen size's stock", async () => {
      const soldOut = await checkout([{ productId: shirt.id, quantity: 1, size: "S" }]);
      assert.equal(soldOut.status, 400);
      assert.equal(soldOut.body.error, "Linen Shirt in size S is out of stock");

      const tooMany = await checkout([
        { productId: shirt.id, quantity: 2, size: "M" },
        { productId: shirt.id, quantity: 2, size: "M", color: "White" },
      ]);
      assert.equal(tooMany.body.error, "Only 3 left of Linen Shirt in size M");

      const noSize = await checkout([{ productId: shirt.id, quantity: 1, size: "XL" }]);
      assert.equal(noSize.body.error, "Please choose an available size for Linen Shirt");

      const ok = await checkout([{ productId: shirt.id, quantity: 2, size: "M" }]);
      assert.equal(ok.status, 200);
    });

    it("takes the size and the total out of stock when paid, and puts them back on cancel", async () => {
      await checkout([{ productId: shirt.id, quantity: 2, size: "M" }]);
      const order = await Order.findOne();
      await pay(order.stripeSessionId);
      assert.deepEqual(await stock(), [1, 0, 1]);

      const cancel = await request(app)
        .patch(`/admin/orders/${order.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "cancelled" });
      assert.equal(cancel.status, 200);
      assert.deepEqual(await stock(), [3, 0, 3]);
    });

    it("never lets a size go below 0", async () => {
      await checkout([{ productId: shirt.id, quantity: 3, size: "M" }]);
      const order = await Order.findOne();
      await Product.updateOne(
        { _id: shirt.id, "sizeStock.size": "M" },
        { $set: { "sizeStock.$.inStock": 1, inStock: 1 } }
      );
      await pay(order.stripeSessionId);
      assert.deepEqual(await stock(), [0, 0, 0]);
    });
  });

  describe("shop size filter", () => {
    it("hides products whose chosen size is sold out", async () => {
      await Product.create({
        title: "Sold Out In M",
        category: ["Men"],
        price: 10,
        size: ["S", "M"],
        inStock: 2,
        sizeStock: [
          { size: "S", inStock: 2 },
          { size: "M", inStock: 0 },
        ],
      });
      await Product.create({ title: "Whole Product Stock", category: ["Men"], price: 10, size: ["M"], inStock: 4 });

      const m = await request(app).get("/products/shop?size=M");
      assert.deepEqual(m.body.data.map((p) => p.title), ["Whole Product Stock"]);
      const s = await request(app).get("/products/shop?size=S");
      assert.deepEqual(s.body.data.map((p) => p.title), ["Sold Out In M"]);
    });
  });
});
