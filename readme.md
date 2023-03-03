<a name="readme-top"></a>

<br />
<div align="center">
<h3 align="center">Our Best Side</h3>

  <p align="center">
    Our Best Side, an e-commerce site built using the MERN stack, integrated with AWS S3 buckets for image uploads, Stripe for simulating the checkout process and React Redux for cart management. 
    <br />
    <br />
    <a href="https://ourbestside.netlify.app/">View Demo</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#initial design mockups">Initial Wireframe Mockups</a></li>
        <li><a href="#live snippets">Working App Snippets</a></li>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>
<br/>

<!-- INITIAL WIREFRAME MOCKUPS -->

## Initial Wireframe Mockups

Home page:

![homepage](https://user-images.githubusercontent.com/115219748/217848852-58228ab3-aa95-49d6-be0b-7d99a02f35ea.PNG)

Product Category page:

![product category page](https://user-images.githubusercontent.com/115219748/217857888-06fe5f16-e49b-407b-a707-06159e9140df.PNG)

Cart page:

![cart page](https://user-images.githubusercontent.com/115219748/217857929-6a457487-641a-40f0-a42c-6bd3035ef271.PNG)

<!-- WORKING APP SNIPPETS -->

## Working App Snippets

Upon loading the site, this is the first thing that users will see:

![homepage 1](https://user-images.githubusercontent.com/115219748/217859997-21b7e809-5413-4787-b0a0-e3ef23b71d73.PNG)

There is a carousel toggle that allows the images to move. This is the second image:

![homepage 2](https://user-images.githubusercontent.com/115219748/217860043-3983a593-2e31-48ec-b09a-883638902cb0.PNG)

The bottom half of the home page looks like this:

![featured](https://user-images.githubusercontent.com/115219748/217863177-7da901fc-da37-4f73-83a6-6bb1ae6dbe1f.PNG)

Users may click on the individual images under the Featured Products section to be brought to the product page, or they may browse by categories located in the Navbar.

The product category page looks like:

![category](https://user-images.githubusercontent.com/115219748/217864784-de4c79d8-c101-4cf3-81f5-b2321cffca64.PNG)

The individual product page looks like this:

![item page](https://user-images.githubusercontent.com/115219748/217865466-fe333bad-2837-4cce-b85a-8a0acb2a563d.PNG)

Notice the cart updates at the top-right corner of the page, this is done using Redux to manage the state. Users may navigate freely around the site and the cart number will "follow" them.

When the user is ready to make payment, they may click on the cart icon to be taken to the cart page. This is the cart page:

![cart](https://user-images.githubusercontent.com/115219748/217866507-a7e7aa41-f16b-4555-bf5f-0f58ad357258.PNG)

Upon verifying that the item(s) and quantity is right, users will press "Checkout Now" to be taken to Stripe payment page.

This is the Stripe payment page:

![stripe](https://user-images.githubusercontent.com/115219748/217866549-599cab2a-6658-467e-acec-af4816229ff3.PNG)

There is also a section for the admin dashboard. This allows the admin or store owner to upload new products or edit existing products.

Upon successful login, the admin user will see a "Dashboard" button appear in the Navbar. This Dashboard link is only shown when the admin logs in with the right credentials.

The Navbar will look like this:

![nav snippet](https://user-images.githubusercontent.com/115219748/217868603-bcdac16c-f9f4-498f-af78-6c4f906b9b2b.PNG)

The admin dashboard has a simple UI, afterall it is only meant to be viewed by the admin. It allows the admin to upload a new product and edit an existing product.

The combined features of the dashboard looks like this:

![admin](https://user-images.githubusercontent.com/115219748/217871933-5ae07666-9504-4c0a-b72b-ede805330f1e.PNG)

The images uploaded when creating a new product is stored in an AWS S3 bucket.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- BUILT WITH -->

### Built With

- ![React Badge](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=000&style=for-the-badge)
- ![Express Badge](https://img.shields.io/badge/Express-000?logo=express&logoColor=fff&style=for-the-badge)
- ![Node.js Badge](https://img.shields.io/badge/Node.js-393?logo=nodedotjs&logoColor=fff&style=for-the-badge)
- ![MongoDB Badge](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=fff&style=for-the-badge)
- ![JavaScript Badge](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000&style=for-the-badge)
- ![HTML5 Badge](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=fff&style=for-the-badge)
- ![CSS3 Badge](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=fff&style=for-the-badge)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

- https://github.com/desmondtansl

Project Link: https://github.com/desmondtansl/Our-Best-Side

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

- All images used were taken from Unsplash and Pexels

<p align="right">(<a href="#readme-top">back to top</a>)</p>
