import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();
import userModel from "../models/user.js";
import * as uuid from "uuid";
import multer from "multer";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import crypto from "crypto";
import cookieParser from "cookie-parser";

const bucketName = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_KEY

const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey
    }
})

const storage = multer.memoryStorage();
const upload = multer({storage:storage})

export const uploadUserPicture = upload.fields([{name: 'picture', maxCount: 1}]);

const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString('hex')


// import {upload} from "../../middleware/multerConfig.js";
// import Redis from "redis";
//
// const redisClient = Redis.createClient({
//     url: 'redis://redis:6379'
// });


// const getOrSetCache = async (key, cb) => {
//     console.log("getOrSetCache: ");
//     try {
//         if (!redisClient.isOpen) {
//             await redisClient.connect();
//             console.log("redisClient connected");
//         }
//         const data = await redisClient.get(key);
//         if(data != null) {
//             console.log("getCache: ", JSON.stringify(data));
//             return JSON.parse(data);
//         } else {
//             const freshData = await cb();
//             const DEFAULT_EXPIRATION = 3600;
//             console.log(freshData);
//             await redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));
//             console.log("setCache: ", JSON.stringify(freshData));
//             return freshData;
//         }
//     } catch (err) {
//         console.error("getOrSetCache error: ", err);
//         throw err;
//     }
// }


export const userLogIn = async (req, res) => {
    const {provider, email, password} = req.body;
    console.log(req.body);

    try {
        if (provider === 'native') {
            if (!email || !password) {
                return res.status(400).json({error: 'Email and password are required for native provider'});
            }

            // const user = await getOrSetCache(`userSignIn?email=${email}`, async ()=>{
            //     return await userModel.getUserByEmail(email);
            // })
            const user = await userModel.getUserByEmail(email);
            // const sessionToken = uuid.v4();
            // const expiresAt = new Date(Date.now() + 3600000);
            // const sessions = {};
            //
            // sessions[sessionToken] = {
            //     expiresAt,
            //     userId: user.id,
            // }
            //
            // console.log("sessionToken: ", sessionToken);
            // res.cookie("session_token", sessionToken, {
            //     maxAge:expiresAt, domain: 'localhost', path: '/'
            // });
            // console.log("res.cookie: ", res.cookie);

            if(!user) {
                return res.status(400).json({error: 'User does not exist'});
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if(!isMatch) {
                return res.status(400).json({error: 'Password is incorrect'});
            }

            const token = jwt.sign({
                id: user.id,
                name: user.name,
                email: user.email,
                picture: user.picture,
                role: user.role
            }, process.env.JWT_SECRET, { expiresIn: '1h' });
            console.log(token);
            // localStorage.setItem('access_token', token);
            // const oneHour = 3600000; // 1小时的毫秒数
            // res.cookie("access_token", token, {maxAge:oneHour, domain: 'localhost', path: '/', httpOnly: true});
            // console.log("set cookie: ", res.cookie);


            return res.status(200).json({
                    access_token: token,
                    access_expired: 3600,
                    user: {
                        id: user.id,
                        provider: user.provider,
                        name: user.name,
                        email: user.email,
                        picture: user.picture,
                        role: user.role
                    },
            });


        } else if (provider === 'facebook') {
            if (!access_token) {
                return res.status(400).json({error: 'Access token is required for facebook provider'});
            }

            const token = req.headers.authorization.split('.')[1];
            // const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoidGVzdDIiLCJlbWFpbCI6InRlc3QyQHRlc3QuY29tIiwiaWF0IjoxNjk4OTk2NTQ3LCJleHAiOjE2OTkwMDAxNDd9.hbaRYW_Q8_uPXbhfBSeC7yZNIcLbkshT3cd7A9wsWzg";

            console.log("access_token: ", access_token);
            console.log("token: ", token);
            jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
                if (err) {
                    return res.status(403).json({error: 'Token is invalid or expired'});
                }

                console.log("decodedToken: ", decodedToken);

                return res.status(200).json({
                    data: {
                        access_token: token,
                        access_expired: 3600,
                        // user: {
                        //     id: user.id,
                        //     provider: user.provider,
                        //     name: user.name,
                        //     email: user.email,
                        //     picture: user.picture,
                        // },
                    }
                });
            });
            // 在这里添加逻辑来验证 Facebook access token
            // 并从 Facebook 获取用户信息
            // user = await getUserInfoFromFacebook(access_token);

        } else {
            return res.status(400).json({error: 'Invalid provider'});
        }

    } catch (err) {
        console.error(err);
        return res.status(500).json({error: 'Internal server error'});
    }

}

export const getUserFavoriteCafes = async (req, res) => {
    const userId = req.query.userId;
    try {
        const cafes = await userModel.getUserFavoriteCafes(userId);
        return res.status(200).json(cafes);
    } catch (err) {
        console.log(err);
        throw new Error(err);
    }
}

export const userLogOut = async (req, res) => {
    return res.status(200).json({
        data: {
            message: 'Log out successfully'
        }
    });
}


export const userSignUp = async (req, res) => {
    const {name, email, password} = req.body;
    console.log("request body: ", req.body);

    if (!req.files) {
        return res.status(400).json({error: "No files were uploaded."});
    }
    const file = req.files['picture'][0];
    const fileBuffer = await sharp(file.buffer)
        .resize({ height: 1920, width: 1080, fit: "contain" })
        .toBuffer()
    const fileName = generateFileName();
    const uploadParams = {
        Bucket: bucketName,
        Body: fileBuffer,
        Key: fileName,
        ContentType: file.mimetype,
    };


    try {
        const userExists = await userModel.checkUserExists(email);
        if (userExists) {
            return res.status(409).json({ error: "Email already exists" });
        }
        await s3Client.send(new PutObjectCommand(uploadParams));
        const imagePath = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
                Bucket: bucketName,
                Key: fileName
            }),
        )
        // console.log('File uploaded to S3 successfully. Location: ', uploadResult.Location);


        const hashedPassword = bcrypt.hashSync(password, 10);
        const userId = await userModel.createUser(
            {
                provider: "native",
                name: name,
                email: email,
                picture: imagePath,
                hashedPassword: hashedPassword,
                role: 'customer'
            }
        );
        // const sessionToken = uuid.v4();
        // const oneHour = 3600000; // 1小时的毫秒数
        // const sessions = {};

        // sessions[sessionToken] = {
        //     expiresAt,
        //     userId: userId,
        // }

        // console.log("sessionToken: ", sessionToken);
        // res.cookie("session_token", sessionToken, {maxAge:expiresAt, domain: 'localhost', path: '/'});
        // console.log("res.cookie: ", res.cookie);

        const token = jwt.sign({
            id: userId,
            name: name,
            email: email,
            picture: imagePath,
            role: 'customer'
        }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // localStorage.setItem('access_token', token);
        console.log(token);
        // res.cookie("access_token", token, {maxAge:oneHour, domain: 'localhost', path: '/', httpOnly: true});
        // console.log("localStorage: ", localStorage.getItem('access_token'));
        return res.status(200).json({
                access_token: token,
                access_expired: 3600,
                user: {
                    id: userId,
                    provider: "native",
                    name: name,
                    email: email,
                    picture: imagePath,
                    role: 'customer'
                },
        });
    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
