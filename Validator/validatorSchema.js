const joi = require('joi')

 const validator = (schema) => (payload) =>
 schema.validate (payload, { abortEarly: false })

 
 //registration validation
const signupValidator = joi.object({
    username: joi.string().lowercase().required(),
    email: joi.string().email().lowercase().required(),
    password: joi.string().min(8).max(16).required()
});

//login validation
const loginValidator = joi.object({
    email: joi.string().email().lowercase().required(),
    password: joi.string().min(8).max(16).required()
});

//verify otp validation
const verifyOtpValidator = joi.object({
    email: joi.string().email().lowercase().required(),
    otp: joi.string().min(6).max(6).required()
});

//resend otp
const resendOtpValidator = joi.object({
    email: joi.string().email().lowercase().required()
});

//reset password link
const resetPasswordLinkValidator = joi.object({
    email: joi.string().email().lowercase().required()
});

//set new password
const setPasswordValidator = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(8).max(16).required()
});

//change password
const changePasswordValidator = joi.object({
    email: joi.string().email().required()
});


exports.signupValidator = validator(signupValidator)
exports.loginValidator = validator(loginValidator)
exports.verifyOtpValidator= validator(verifyOtpValidator)
exports.resendOtpValidator = validator(resendOtpValidator)
exports.resetPasswordLinkValidator = validator(resetPasswordLinkValidator)
exports.setPasswordValidator = validator(setPasswordValidator)
exports.changePasswordValidator = validator(changePasswordValidator)