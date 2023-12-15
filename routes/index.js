import users from './user.js'
import products from './product.js'
import orders from './order.js'
import admins from './admin.js'

const { authenticated } = require('../middlewares/auth.js')

module.exports = app => {
    app.use('/users', users)
    app.use('/products', products)
    app.use('/order', authenticated, orders)
    app.use('/admin', admins)
    app.use('/', (req, res) => { return res.json({ status: 'success', message: 'welcome to cafe api' }) })
}