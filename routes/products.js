const {Product} = require('../models/product');
const express = require('express');
const {Category} = require('../models/category');
const router = express.Router();
const mongood = require('mongoose');
const multer = require('multer');

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
}


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('Invalid image type');

        if(isValid) {
            uploadError = null
        }

        cb(uploadError, 'public/uploads');
    },
    filename: function (req, file, cb) {
        const filename = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${filename}-${Date.now()}.${extension}`);
    }
})

const uploadOptions = multer({ storage: storage });


/**
 * @swagger
 * components:
 *  schemas:
 *      Product:
 *          type: object
 *          required:
 *              - title
 *              - author
 *              - countInStock
 *          properties:
 *              id:
 *                  type: string
 *                  description: The auto-generated id of product
 *              name:
 *                  type: string
 *                  description: The product description
 *              richDescription:
 *                  type: string
 *                  description: A more detailed description
 *              image:
 *                  type: string
 *                  description: Product image
 *              images:
 *                  type: string
 *                  description: Product images
 *              brand:
 *                  type: string
 *                  description: Product brand
 *              price:
 *                  type: Number
 *                  description: Price of product
 *              category:
 *                  type: Category
 *                  description: The category the product exists
 *              countInStock:
 *                  type: Number
 *                  description: The number of products in stock
 *              rating:
 *                  type: Number
 *                  description: Product rating
 *              numReviews:
 *                  type: Number
 *                  description: Number of roduct reviews
 *              isFeatured:
 *                  type: Boolean
 *                  description: Is the product featured
 *              dateCreated:
 *                  type: Date
 *                  description: When the product was added
 *          example:
 *              id: 610d7bf0afda7623d078bcbd
 *              name: Product6
 *              description: Product6 description
 *              richDescription: Product6 rich description
 *              image: http://localhost:3000/public/uploads/test_img_two.jpg-1628335569296.jpeg
 *              images: http://localhost:3000/public/uploads/test_img_two.jpg-1628335569296.jpeg
 *              brand: Product6 brand
 *              price : 54
 *              category: computing
 *              countInStock: 3
 *              rating: 9
 *              numReviews: 4
 *              isFeatured: true
 *              dateCreated: 2021-08-06T19:14:19.469Z         
 */ 


/**
 * @swagger
 * tags:
 *  name: Products
 *  description: The product managing API
 */


/**
 * @swagger
 * /api/v1/products:
 *  get:
 *      summary: Returns a list of products
 *      tags: [Products]
 *      description: Use to request all products by category
 *      responses:
 *          '200':
 *              description: A list of products
 *              content: 
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/Product'
 *          '500':
 *              description: Failed to get products from server
 */
router.get(`/`, async (req, res) => {
    let filter = {};

    if(req.query.categories) {
        filter = { category: req.query.categories.split(',') };
    }

    const productList = await Product.find(filter).populate('category');

    // Return only the product name and image and exclude '_id'
    // const productList = await Product.find().select('name image -_id');

    if(!productList) {
        res.status(500).json({ success: false })
    }
    res.send(productList);
})


/**
 * @swagger
 * /api/v1/products/{id}:
 *  get:
 *      summary: Get a product by id
 *      tags: [Products]
 *      description: Use to request one product by id number
 *      parameters:
 *          - in: path
 *            name: id
 *            schema:
 *              type: string
 *            required: true
 *            description: The product id
 *      responses:
 *          200:
 *              description: The product description by id
 *              contents:
 *                  application/json:
 *                      schema:
 *                          $ref: '#/components/schemas/Product'
 *          
 */
router.get(`/:id`, async (req, res) => {
    // const product = await Product.findById(req.params.id);

    try {
        // To link and display category which is in the category table uncomment this line
        const product = await Product.findById(req.params.id).populate('category');
        res.send(product);

    } catch(err) {
        res.status(404).json({
            success: false,
            message: "Product could NOT be found!"
        })
    }
    
})


/**
 * @swagger
 * /api/v1/products:
 *  post:
 *      summary: Create a new product
 *      tags: [Products]
 *      description: Use to create a new product
 *      responses:
 *          '200':
 *              description: A successfull response
 *          '500':
 *              description: The product can not be created
 */
// Post - Create new product in DB
router.post('/', uploadOptions.single('image'), async (req, res) => {
    const category = await Category.findById(req.body.category);
    if(!category) return res.status(400).send('Invalid Category!')

    // Check if there is an image file
    const file = req.file;
    if(!file) return res.status(400).send('No image file in the request!') 

    const fileName = req.file.filename;
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

    let product = new Product({
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: `${basePath}${fileName}`,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured,
     })

    product = await product.save();

    if(!product)
    return res.status(500).send('The product can not be created');

    res.send(product);
})


/**
 * @swagger
 * /api/v1/products/{id}:
 *  put:
 *      description: Use to update a product
 *      responses:
 *          '200':
 *              description: A successfull response
 *          '500':
 *              description: The product can not be updated!
 */
// Put - Update a product in DB 
router.put('/:id', uploadOptions.single('image'), async (req, res) => {
    // test that product ID is valid
    if(!mongood.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid product ID!');
    }

    const category = await Category.findById(req.body.category);
    if(!category) return res.status(400).send('Invalid Category!')

    // Find product in mongoDB to update
    const product = await Product.findById(req.params.id);
    if(!product) return res.status(400).send('Invalid Product!')

    // Workout if the user is sending a new image or to use the existing image
    const file = req.file;
    let imagepath;
    if(file) {
        const fileName = file.filename;
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
        imagepath = `${basePath}${fileName}`;
    } else {
        imagepath = product.image;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            description: req.body.description,
            richDescription: req.body.richDescription,
            image: imagepath,
            brand: req.body.brand,
            price: req.body.price,
            category: req.body.category,
            countInStock: req.body.countInStock,
            rating: req.body.rating,
            numReviews: req.body.numReviews,
            isFeatured: req.body.isFeatured,
        },
        {
            new: true
        }
    )

    if(!updatedProduct)
    return res.status(500).send('The product can not be updated!');

    res.send(updatedProduct);
})


/**
 * @swagger
 * /api/v1/products/{id}:
 *  delete:
 *      description: Use to delete a product by id number
 *      responses:
 *          '200':
 *              description: A successfull response
 *          '400':
 *              description: The product can not be deleted!
 */
// Delete a product
router.delete('/:id', (req, res) => {
    Product.findByIdAndRemove(req.params.id).then(product => {
        if(product) {
            return res.status(200).json({
                success: true,
                message: 'the product was deleted!'
            })
        } else {
            return res.status(404).json({
                success: false,
                message: 'product NOT found!'
            })
        }
    }).catch(err => {
        return res.status(400).json({
            success: false,
            error: err
        })
    })
})


/**
 * @swagger
 * /api/v1/products/get/featured/{count}:
 *  get:
 *      description: Use to get featured products
 *      responses:
 *          '200':
 *              description: A successfull response
 *          '500':
 *              description: Failed to get featured products
 */
// Get featured products in DB
router.get(`/get/featured/:count`, async (req, res) => {
    const count = req.params.count ? req.params.count : 0;
    const products = await Product.find({isFeatured: true}).limit(+count);

    if(!products) {
        res.status(500).json({ success: false })
    }
    res.send(products);
})


/**
 * @swagger
 * /api/v1/products/get/count:
 *  get:
 *      description: Use to get total number of products
 *      responses:
 *          '200':
 *              description: A successfull response
 *          '500':
 *              description: Failed to get total number of products
 */
// Get total number of all products in DB
router.get(`/get/count`, async (req, res) => {
    const productCount = await Product.countDocuments((count) => count);

    if(!productCount) {
        res.status(500).json({
            success: false
        })
    }
    res.send({
        productCount: productCount
    });
})


/**
 * @swagger
 * /api/v1/products/gallery-images/{id}:
 *  put:
 *      description: Use to update a products image only
 *      responses:
 *          '200':
 *              description: A successfull response
 *          '500':
 *              description: The products image can not be updated!
 */
// Used only for updating the products images
router.put('/gallery-images/:id', uploadOptions.array('images', 10), async (req, res) => {
    // test that product ID is valid
    if(!mongood.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid product ID!');
    }  

    const files = req.files;
    let imagePaths = [];
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

    if(files) {
        files.map(file => {
            imagePaths.push(`${basePath}${file.originalname}`);
        })
    }

    const product = await Product.findByIdAndUpdate(
        req.params.id,
        {
            images: imagePaths,
        },
        {
            new: true
        }
    )

    if(!product)
    return res.status(500).send('The product can not be updated!');

    res.send(product);

})


module.exports = router;