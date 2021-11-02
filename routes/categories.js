const {Category} = require('../models/category')
const express = require('express');
const router = express.Router();

// Get categories
router.get(`/`, async (req, res) => {
    const categoryList = await Category.find().catch(err => {
        return res.status(500).json({ success: false, error: err })
    });

    if(!categoryList) {
        res.status(500).json({
            success: false
        })
    }
    res.status(200).send(categoryList);
})


// Get a single category
router.get('/:id', async (req, res) => {
    const category = await Category.findById(req.params.id);

    if(!category) {
        res.status(500).json({
            success: false,
            message: 'Category with the given ID was NOT found!'
        })
    }
    res.status(200).send(category);
})


// Post - create category
router.post('/', async (req, res) => {
    let category = new Category({
        name: req.body.name,
        icon: req.body.icon,
        color: req.body.color
    })
    category = await category.save();

    if(!category)
    return res.status(404).send('The category cannot be created!');

    res.send(category);
})


// Put - Update a category
router.put('/:id', async (req, res) => {
    const category = await Category.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            icon: req.body.icon || category.icon,
            color: req.body.color
        },
        {
            new: true
        }
    )

    if(!category)
    return res.status(404).send('The category cannot be updated!');

    res.send(category);
})


// Delete - delete category
router.delete('/:id', (req, res) => {
    Category.findByIdAndRemove(req.params.id).then(category => {
        if(category) {
            return res.status(200).json({
                success: true,
                message: 'the category was deleted!'
            })
        } else {
            return res.status(404).json({
                success: false,
                message: 'category NOT found!'
            })
        }
    }).catch(err => {
        return res.status(500).json({
            success: false,
            error: err
        })
    })
})

module.exports = router;
