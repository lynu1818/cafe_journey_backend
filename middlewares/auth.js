// import passport from '../config/passport'

// const authenticatedAdmin = (req, res, next) => {
//     passport.authenticate('jwt', { session: false }, (err, user, info) => {
//         if (!user) {
//             console.log(err)
//             req.flash('warning_msg', 'JWT驗證未通過!')
//             return res.redirect('/admin/login')
//         }
//         if (user.role !== 'admin') {
//             req.flash('danger_msg', '權限不足!')
//             return res.redirect('/admin/login')
//         }
//         res.locals.user = req.user
//         res.locals.isAuthenticated = req.isAuthenticated()
//         return next()
//     })(req, res, next)
// }
//
// const authenticated = (req, res, next) => {
//     passport.authenticate('jwt', { session: false }, (err, user, info) => {
//         if (!user) {
//             console.log(err)
//             req.flash('warning_msg', 'JWT驗證未通過!')
//             return res.status(200).json({ message: 'JWT驗證未通過!' });
//         }
//         res.locals.user = req.user
//         res.locals.isAuthenticated = req.isAuthenticated()
//         // res.locals.token = req.session.token
//         // console.log('---req.session.token--', req.session.token)
//         return next()
//     })(req, res, next)
// }
import UserModel from "../models/user.js";
import session from "express-session";

export const auth = async (req, res, next) => {
    const token = req.cookies.session_token;

    if (!token) {
        return res.status(401).json({ error: 'No session token provided' });
    }

    try {
        // 检查 session_token 是否有效
        // 假设 sessions 是存储在内存或数据库中的 token
        const sessions = {};
        const session = sessions[token];
        if (!session || session.expiresAt < new Date()) {
            throw new Error('Session token is invalid or expired');
        }

        // 可选：获取用户信息
        req.user = await userModel.getUserById(session.userId);

        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired session token' });
    }
}