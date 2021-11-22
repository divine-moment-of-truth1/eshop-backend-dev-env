const {Order} = require('../models/order');
const {Product} = require('../models/product');
const {OrderItem} = require('../models/order-item');
const express = require('express');
const router = express.Router();
const stripe = require('stripe')('sk_test_51JiFcVB3A3vPzVfarsBcKfQfLRMm6eicdgWmbEEOxw27MESRash9aP9SUVS3iX28agZrr3klTEe0EY0VN1ee5UrK00QrDDJ4Cd');

// Get all orders
router.get(`/`, async (req, res) =>{

    // add user detail property to returned order - 'name'. Also, sort by date - newset to oldest
    const orderList = await Order.find().populate('user', 'name').sort({'dateOfOrder': -1}).catch(err => {
        return res.status(500).json({ success: false, error: err })
    });

    if(!orderList) {
        res.status(500).json({success: false})
    } 
    res.send(orderList);
})

// Get orders by id
router.get(`/:id`, async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate("user", "name")
        .populate({
            path: "orderItems",
            populate: {
                path: "product",
                populate: "category",
            },
        });
  
    if (!order) {
      res.status(500).json({ success: false });
    }
    res.send(order);
  });

// Post - create a new order
router.post('/', async (req, res) => {

    const orderItemsIds = Promise.all(req.body.orderItems.map(async orderitem => {
        let newOrderItem = new OrderItem({
            quantity: orderitem.quantity,
            product: orderitem.product
        })

        newOrderItem = await newOrderItem.save();

        return newOrderItem._id
    }))

    const orderItemsIdsresolved = await orderItemsIds;

    // Get price of all items
    const totalPrices = await Promise.all(orderItemsIdsresolved.map(async (orderItemId) => {
        const orderItem = await OrderItem.findById(orderItemId).populate('product', 'price');
          const totalPrice = orderItem.product.price * orderItem.quantity;
        return totalPrice;
    }))  

    // Get sum of all items in the totalPrices array
    const totalPrice = totalPrices.reduce((a, b) => a + b, 0);       // intialise the total price to be zero

    let order = new Order({
        orderItems: orderItemsIdsresolved,
        shippingAddress1: req.body.shippingAddress1,
        shippingAddress2: req.body.shippingAddress2,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        phone: req.body.phone,
        status: req.body.status,
        totalPrice: totalPrice,
        user: req.body.user,
     })

     order = await order.save();

    if(!order)
        return res.status(500).send('The order could not be created');

    res.send(order);
})

router.post('/create-checkout-session', async (req, res) => { 
    const orderItems = req.body;

    if (!orderItems) {
        return res.status(400).send('Checkout session can not be created - Check the order items');
    }

    const lineItems = await Promise.all(
        orderItems.map(async (orderItem) => {
            const product = await Product.findById(orderItem.product.id);
            return {
                price_data: {
                    currency: 'usd',
                    product_data: {
                      name: product.name,
                    },
                    unit_amount: product.price * 100,
                  },
                  quantity: orderItem.quantity,
            };
        })
    );

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: 'http://localhost:4200/success',
        cancel_url: 'http://localhost:4200/error'
    })

    res.json({ id: session.id });
});

// Put - Update an order - to change the status of the order
router.put('/:id', async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            status: req.body.status
        },
        {
            new: true
        }
    )

    if(!order)
    return res.status(404).send('The order cannot be updated!');

    res.send(order);
})

// Delete - delete order - also delete order items within the order
router.delete('/:id', (req, res) => {
    Order.findByIdAndRemove(req.params.id).then(async order => {
        if(order) {
            await order.orderItems.map(async orderItem => {
                await OrderItem.findByIdAndRemove(orderItem);
            }) 
            
            return res.status(200).json({ success: true, message: 'the order was deleted!' })
        } else {
            return res.status(404).json({ success: false, message: 'order NOT found!' })
        }
    }).catch(err => {
        return res.status(500).json({ success: false, error: err })
    })
})

// Statics - get the total sales in the whole e-shop
router.get('/get/totalsales', async (req, res) => {
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalSales: { $sum: '$totalPrice' }} }   // have to add '_id: null' because Mongo can not return an object without an id
    ])

    if(!totalSales) {
        return res.status(400).send('The order sales can not be generated!')
    }

    res.send({totalSales: totalSales.pop().totalSales});    // use 'pop()' to remove the '_id' part in the returned object
})


// Get total number of all sales i.e. total number of orders
router.get(`/get/count`, async (req, res) => {
    const orderCount = await Order.countDocuments((count) => count);

    if(!orderCount) {
        res.status(500).json({
            success: false
        })
    }
    res.send({
        orderCount: orderCount
    });
})


// Get order history for a user
router.get('/get/userOrders/:userid', async (req, res) => {
    const userOrderList = await Order.find({user: req.params.userid})
        .populate({
            path: 'orderItems', populate: {
                path: 'product', populate: 'category'}
        }).sort({'dateOrdered': -1});

    if(!userOrderList)
        res.status(500).json({success: false});

    res.send(userOrderList);
})

module.exports =router;