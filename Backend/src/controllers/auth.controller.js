const userModel = require('../models/user.model.js')
const jwt = require('jsonwebtoken')
const bcrypt = require("bcryptjs")
const tokenBlacklistModel = require("../models/blacklist.model.js")

/**
 * @name registerUserController
 * @description register a new user, expects username, email or password
 * @access Public
*/
const registerUserController = async (req, res) => {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
        return res.status(400).json({
            message: "Please provide username, email and password",
            success: false
        })
    }

    const isUserAlreadyExists = await userModel.findOne({
        $or: [{ username }, { email }]
    })

    if (isUserAlreadyExists) {
        return res.status(400).json({
            message: "Account is already exists with this email address or username",
            success: false
        })
    }

    const hashPassword = await bcrypt.hash(password, 10)

    const user = await userModel.create({
        username,
        email,
        password: hashPassword
    })

    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    })

    return res.status(201).json({
        message: "User created successfully",
        success: true,
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
*/
const loginUserController = async (req, res) => {
    const { email, password } = req.body
    const user = await userModel.findOne({ email })

    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password",
            success: false
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid email or password",
            success: false
        })
    }

    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    })
    return res.status(200).json({
        message: "User logged in successfully",
        success: true,
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access Public
*/
const logoutUserController = async (req, res) => {
    const token = req.cookies.token

    if (token) {
        await tokenBlacklistModel.create({ token })
    }

    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    })
    return res.status(200).json({
        message: "User logged out successfully",
        success: true
    })
}

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access Private
*/
const getMeController = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id)

        if (!user) {
            res.clearCookie("token", {
                httpOnly: true,
                secure: true,
                sameSite: "none"
            })
            return res.status(401).json({
                message: "User session expired or database changed. Please register or log in again.",
                success: false
            })
        }

        return res.status(200).json({
            message: "User details fetched successfully",
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error: " + err.message,
            success: false
        })
    }
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}