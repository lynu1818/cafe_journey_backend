import express from "express";
import cafe from "./routes/cafe.js";
import bodyParser from "body-parser";
import cors from "cors";
import user from "./routes/user.js";
import review from "./routes/review.js";
import { auth } from "./middlewares/auth.js";
import tag from "./routes/tag.js";
import dotenv from "dotenv";
dotenv.config();
import session from "express-session";
import cookieParser from "cookie-parser";


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cookieParser());
// app.use(session({
//     secret: 'mySecret',
//     resave: false,
//     saveUninitialized: true,
//     cookie: { secure: true }
// }));
app.use(cors(
    {
        origin: 'http://localhost:3000',
        credentials: true
    }
));
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});
app.use(cafe);
app.use(user);
app.use(review);
app.use(tag);

app.get('/',auth,  (req, res) => {
    console.log("req.session: ", req.session)
    console.log("req.sessionID: ", req.sessionID)
})

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});