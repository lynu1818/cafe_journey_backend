import { connection } from '../utils/db.js'
import bcrypt from 'bcrypt'
import userModel from '../models/user.js'
import productModel from '../models/product.js'


const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const memcached = require('memcached')
const cache = new memcached('localhost:3001')

const { sendMail, payMail } = require('../utils/sendMail')

// imgur
const imgur = require('imgur-node-api')
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID
const uploadImg = path => {
    return new Promise((resolve, reject) => {
        imgur.upload(path, (err, img) => {
            if (err) {
                return reject(err)
            }
            return resolve(img)
        })
    })
}

const adminController = {
    loginPage: (req, res) => {
        const email = req.session.email
        return res.json({ email });
    },
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body
            const user = await userModel.findOne({ where: { email } })
            req.session.email = email
            if (!user) {
                req.flash('warning_msg', 'Email incorrect!')
                return res.status(401).json({ message: 'Email incorrect! redirect to admin/login' })
            }
            if (user.role !== 'admin') {
                req.flash('danger_msg', 'No authority!')
                return res.status(403).json({ message: 'No authority! redirect to admin/login' })
            }
            if (!bcrypt.compareSync(password, user.password)) {
                req.flash('warning_msg', 'Password incorrect!')
                return res.status(401).json({ message: 'Password incorrect! redirect to admin/login' })
            }
            // token
            const payload = { id: user.id }
            const expiresIn = { expiresIn: '10h' }
            const token = jwt.sign(payload, process.env.JWT_SECRET, expiresIn)
            // memcached
            const lifetime = 60 * 60 * 6 // seconds
            cache.set('token', token, lifetime, (err) => {
                if (err) {
                    console.log(err)
                }
                console.log('memcached set OK!')
                return cache.end() // close connection
            })
            req.flash('success_msg', 'Login Success!')
            return res.status(200).json({ message: 'Login Success! redirect to admin/products' })
        } catch (err) {
            console.log(err)
            return next(err)
        }
    },
    logout: (req, res, next) => {
        req.logout()
        req.session.token = ''
        req.session.email = ''
        cache.del('token', (err) => {
            if (err) {
                console.log(err)
                return next(err)
            }
        })
        req.flash('success_msg', 'Logout Success!')
        return res.status(200).redirect('/admin/login')
    },
    // get all products
    getProducts: async (req, res, next) => {
        try {
            const products = await productModel.findAll({
                raw: true,
                nest: true,
                where: { deletedAt: null }
            })
            return res.render('admin/products', { products })
        } catch (e) {
            console.log(e)
            return next(e)
        }
    },
    // create new product
    postProduct: async (req, res, next) => {
        try {
            const { name, description, price, inventory } = req.body
            if (req.file) {
                imgur.setClientID(IMGUR_CLIENT_ID)
                const img = await uploadImg(req.file.path)
                await Product.create({ name, description, price, inventory, image: img.data.link })
            } else {
                await Product.create({ name, description, price, inventory })
            }
            req.flash('success_msg', 'Product Create Success!')
            return res.status(201).redirect('back')
        } catch (e) {
            console.log(e)
            return next(e)
        }
    },
    // edit product page
    editProduct: async (req, res, next) => {
        try {
            // set status
            const status = 1
            // find the product
            const product = await Product.findByPk(req.params.id)
            // find products
            const products = await Product.findAll({
                raw: true,
                nest: true
            })
            return res.render('admin/products', { product: product.toJSON(), products, status })
        } catch (e) {
            console.log(e)
            return next(e)
        }
    },
    // edit product
    putProduct: async (req, res, next) => {
        try {
            const { name, description, price, inventory } = req.body
            const product = await Product.findByPk(req.params.id)
            if (req.file) {
                imgur.setClientID(IMGUR_CLIENT_ID)
                const img = await uploadImg(req.file.path)
                await product.update({ name, description, price, inventory, image: img.data.link })
            } else {
                await product.update({ name, description, price, inventory, image: product.image })
            }
            req.flash('success_msg', `Product Id:${req.params.id} Edit Success!`)
            return res.status(204).redirect('/admin/products')
        } catch (e) {
            console.log(e)
            return next(e)
        }
    },
    // delete product
    deleteProduct: async (req, res, next) => {
        try {
            const product = await Product.findByPk(req.params.id)
            if (!product) {
                req.flash('warning_msg', '這個商品不存在!')
            }
            if (product.deletedAt !== null) {
                req.flash('warning_msg', '這個商品已經被刪除了!')
            }
            await product.update({
                deletedAt: 1
            })
            req.flash('success_msg', `Product Id:${req.params.id} Delete Success!`)
            return res.status(200).redirect('back')
        } catch (e) {
            console.log(e)
            return next(e)
        }
    },
    // get orders
    getOrders: async (req, res, next) => {
        try {
            const orders = await Order.findAll({
                raw: true,
                nest: true
            })
            return res.render('admin/orders', { orders })
        } catch (e) {
            console.log(e)
            return next(e)
        }
    },
    // get order
    getOrder: async (req, res, next) => {
        try {
            const order = await Order.findByPk(req.params.id, {
                include: 'orderProducts'
            })
            return res.render('admin/order', { order: order.toJSON() })
        } catch (e) {
            console.log(e)
        }
    },
    // ship order
    shipOrder: async (req, res, next) => {
        try {
            const order = await Order.findByPk(req.params.id)
            if (!order) {
                req.flash('warning_msg', 'can not find this order!')
            } else {
                await order.update({ shipping_status: 1 })
                req.flash('success_msg', `Ship Order Id:${req.params.id} Success!`)
                // send mail
                const user = await User.findByPk(order.UserId)
                const email = user.toJSON().email
                const subject = `[TEST]卡羅購物 訂單編號:${order.id} 已出貨!`
                const status = '已出貨 / 已付款'
                const msg = '商品已出貨 再麻煩注意收件地址!'
                sendMail(email, subject, payMail(order, status, msg))
            }
            return res.status(200).redirect('back')
        } catch (e) {
            console.log(e)
            return next(e)
        }
    },
    // cancel order
    cancelOrder: async (req, res, next) => {
        try {
            const order = await Order.findByPk(req.params.id)
            if (!order) {
                req.flash('warning_msg', 'can not find this order!')
            } else {
                await order.update({ shipping_status: -1 })
                req.flash('success_msg', `Cancel Order Id:${req.params.id} Success!`)
            }
            return res.status(200).redirect('back')
        } catch (e) {
            console.log(e)
            return next(e)
        }
    },
    // recover order
    recoverOrder: async (req, res, next) => {
        try {
            const order = await Order.findByPk(req.params.id)
            if (!order) {
                req.flash('warning_msg', 'can not find this order!')
            } else {
                await order.update({ shipping_status: 0 })
                req.flash('success_msg', `Recover Order Id:${req.params.id} Success!`)
            }
            return res.status(200).redirect('back')
        } catch (e) {
            console.log(e)
            return next(e)
        }
    },
    // get users
    getUsers: async (req, res, next) => {
        try {
            const users = await User.findAll({
                raw: true,
                nest: true
            })
            return res.status(200).render('admin/users', { users })
        } catch (e) {
            console.log(e)
            return next(e)
        }
    },
    // change auth
    changeAuth: async (req, res, next) => {
        try {
            const user = await User.findByPk(req.params.id)
            if (!user) {
                req.flash('warning_msg', 'can not find this user!')
            } else {
                if (user.role === 'admin') {
                    await user.update({ role: 'user' })
                } else {
                    await user.update({ role: 'admin' })
                }
                req.flash('success_msg', `Id${user.id}: Change Auth to ${user.role} Success!`)
                return res.status(200).redirect('/admin/authority')
            }
        } catch (e) {
            console.log(e)
            return next(e)
        }
    }
}

module.exports = adminController