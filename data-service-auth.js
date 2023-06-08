const adminPassword = encodeURIComponent( process.env.ADMIN_PASSWORD );
const bcrypt = require('bcryptjs');
const mongoose = require("mongoose");
var Schema = mongoose.Schema;
var userSchema = new Schema({
    "userName": {
        "type": String,
        "unique": true
    },
    "password": String,
    "email": String,
    "loginHistory": [{
        "dateTime": Date,
        "userAgent": String
    }]
})
let User;

//initialize()

module.exports.initialize = function () {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection('mongodb+srv://kvankam:C5sQQNHfsasugV3U@senecaweb.xwagl.mongodb.net/myFirstDatabase?retryWrites=true', { useNewUrlParser: true, useUnifiedTopology: true });
        db.on('error', (err) => {
            reject(err); // reject the promise with the provided error
        });
        db.once('open', () => {
            User = db.model("users", userSchema);
            resolve();
        });
    });
};

module.exports.registerUser = (userData) => {
    return new Promise((resolve, reject) => {
        if (userData.password === userData.password2) {
            bcrypt.genSalt(10, function (err, salt) {
                bcrypt.hash(userData.password, salt, function (err, hash) {
                    userData.password = hash;
                    let newUser = new User(userData);
                    newUser.save((err) => {
                        if (err) {
                            if (err.code == 11000) {
                                reject("username is already taken");
                            }
                            else {
                                reject('there was an error creating this user: ${err}');
                            }
                        }
                        else {
                            resolve();
                        };
                    })
                    if (err)
                        reject("error encrypting the pw");
                })
            })
        }
        else {
            reject("passwords do not match");
        }
    })
}


module.exports.checkUser = (userData) => {
    return new Promise((resolve, reject) => {
        User.find({ userName: userData.userName }).exec()
            .then((users) => {
                if (users.length == 0) {
                    reject("Unable to find user: " + userData.userName);
                }
                else {
                    bcrypt.compare(userData.password, users[0].password)
                        .then((ok) => {
                            if (ok) {
                                users[0].loginHistory.push({
                                    dateTime: (new Date()).toString(),
                                    userAgent: userData.userAgent
                                });
                                User.updateOne({ userName: users[0].userName },
                                    { $set: { loginHistory: users[0].loginHistory } }
                                ).exec()
                                    .then(() => {
                                        resolve(users[0]);
                                    }).catch((err) => {
                                        reject("there was an error veryfing user: " + err);
                                    });
                            }
                            else
                                reject("incorrect password for user: " + userData.userName);
                    });
                }
            }).catch(() => {
                reject("unable to find the user: " + userData.userName);
            })
    })
}

