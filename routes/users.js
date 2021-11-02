const {User} = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');


// Get - get all user
router.get('/', async (req, res) => {
    // const userList = await User.find().select('name phone email'); 

    const userList = await User.find().catch(err => {
        return res.status(500).json({ success: false, error: err })
    }); 

    if(!userList)
        return res.status(500).json({ success: false });

    res.send(userList);
})


// Get - single user
router.get('/:id', async (req, res) => {
    const user = await User.findById(req.params.id).select('-passwordHash');  // return user object without the 'passwordHash' property

    if(!user)
        return res.status(500).json({ success: 'The user with the given ID could not be found' });

    res.status(200).send(user);
})


// Post - create (register) a new user
router.post('/register', async (req, res) => {
    console.log(req.body.password);
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country
     })

    user = await user.save();

    if(!user)
    return res.status(500).send('The user could not be created');

    res.send(user);
})


// Put - update a user
router.put('/:id', async (req, res) => {

    // work out if the user is sending a new password - if they arent then use old password, if they are create a hash for new password
    const userExist = await User.findById(req.params.id);
    let newPassword;
    if(req.body.password) {
        newPassword = bcrypt.hashSync(req.body.password, 10);
    } else {
        newPassword = userExist.passwordHash;
    }

    const user = await User.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            email: req.body.email,
            passwordHash: newPassword,
            phone: req.body.phone,
            isAdmin: req.body.isAdmin,
            street: req.body.street,
            apartment: req.body.apartment,
            zip: req.body.zip,
            city: req.body.city,
            country: req.body.country
        },
        {
            new: true
        }
    )

    if(!user)
        return res.status(500).json({ success: 'The user with the given ID could not be found' });

    res.status(200).send(user);
})


// Login with a user
router.post('/login', async (req, res) => {
    const user = await User.findOne({email: req.body.email});
    const secret = process.env.secret;

    if(!user) {
        return res.status(400).send('User not found!');
    } 

    if(user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user.id,
                isAdmin: user.isAdmin
            },
            secret,
            {
                expiresIn: '1d'     // 1 day
            }
        )
        res.status(200).send({ user: user.email, token: token });
    } else {
        res.status(400).send('Password is incorrect');
    }
    return res.status(200).send(user);
})


// Get total number of users
router.get('/get/count', async (req, res) => {
    const userCount = await User.countDocuments((count) => count);

    if(!userCount) {
        res.status(500).json({ success: false })
    }
    res.send({ userCount: userCount });
})


// Delete a user
router.delete('/:id', (req, res) => {
    User.findByIdAndRemove(req.params.id).then(user => {
        if(!user) {
            return res.status(200).json({
                success: true,
                message: 'the user was deleted!'
            })
        } else {
            return res.status(404).json({
                success: false,
                message: 'user NOT found!'
            })
        }
    }).catch(err => {
        return res.status(400).json({
            success: false,
            error: err
        })
    })
})


module.exports = router;