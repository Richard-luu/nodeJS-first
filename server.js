/*
 ************************   还没优化,可以让前端传集合名字，
 因为删除和修改、获取品牌信息和获取手机信息方法代码一样，
 返回的结果集也一样，只是查询的集合不一样   
 ****************************
 */
var express = require("express");
var async = require("async");
var bodyParser = require("body-parser");
var MongoClient = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectId;
var multer = require("multer");
var upload = multer({
    dest: "d:temp"
});
var fs = require("fs");
var path = require("path");
var app = express();
var url = "mongodb://127.0.0.1:27017";

app.use(
    bodyParser.urlencoded({
        extended: false
    })
);
app.use(bodyParser.json());
//指定静态资源访问目录
app.use(express.static(__dirname + "/public"));
// app.use(express.static(require('path').join(__dirname, 'public')));
// app.use(express.static('public'));

app.use(function (req, res, next) {
    // res.header("Access-Control-Allow-Origin", "*");
    // res.header("Access-Control-Allow-Headers", "X-Requested-With");
    // res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    // 设置响应头来处理跨域问题
    res.set({
        "Access-Control-Allow-Origin": "*"
    });

    next();
});

/*
 ************************    用户    ****************************
 */

//注册用户
app.post("/api/register", function (req, res) {
    var userName = req.body.name;
    var pwd = req.body.pwd;
    var nicik = req.body.nicik;
    var phone = parseInt(req.body.phone);
    var age = parseInt(req.body.age);
    var sex = req.body.sex;
    var isAdmin = req.body.isAdmin === "是" ? true : false;
    var results = {};
    MongoClient.connect(
        url, {
            userNewUrlParser: true
        },
        function (err, client) {
            if (err) {
                //连接数据库失败
                results.code = -1;
                results.msg = "数据库连接失败";
                res.json(results);
                return;
            } else {
                var db = client.db("nodeProject");
                async.series(
                    [
                        function (cb) {
                            db.collection("user")
                                .find({
                                    name: userName
                                })
                                .count(function (err, num) {
                                    if (err) {
                                        cb(err);
                                    } else if (num > 0) {
                                        // 这个人已经注册过了，
                                        cb(new Error("已经注册"));
                                    } else {
                                        // 可以注册了
                                        cb(null);
                                    }
                                });
                        },
                        function (cb) {
                            db.collection("user").insertOne({
                                    name: userName,
                                    password: pwd,
                                    nicik: nicik,
                                    phone: phone,
                                    age: age,
                                    sex: sex,
                                    isAdmin: isAdmin
                                },
                                function (err) {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        cb(null);
                                    }
                                }
                            );
                        }
                    ],
                    function (err, result) {
                        if (err) {
                            results.code = -1;
                            results.msg = "注册失败";
                            res.json(results);
                            client.close();
                            return;
                        } else {
                            // 注册成功
                            results.code = 0;
                            results.msg = "注册成功";
                            results.data = {
                                nicik: nicik,
                                isAdmin: isAdmin
                            };
                        }
                        client.close();
                        res.json(results);
                    }
                );
            }
        }
    );
});

//用户登录
app.post("/api/login", function (req, res) {
    var userName = req.body.name;
    var pwd = req.body.pwd;
    var results = {};
    MongoClient.connect(
        url, {
            userNewUrlParser: true
        },
        function (err, client) {
            if (err) {
                //连接数据库失败
                results.code = -1;
                results.msg = "数据库连接失败";
                res.json(results);
                return;
            } else {
                var db = client.db("nodeProject");
                db.collection("user")
                    .find({
                        name: userName,
                        password: pwd
                    })
                    .toArray(function (err, data) {
                        if (err) {
                            results.code = -1;
                            results.msg = "查询失败";
                        } else if (data.length <= 0) {
                            results.code = -1;
                            results.msg = "用户名或密码错误";
                        } else {
                            // 登录成功
                            results.code = 1;
                            results.msg = "登录成功";
                            results.data = {
                                nicik: data[0].nicik,
                                isAdmin: data[0].isAdmin
                            };
                        }
                        client.close();
                        res.json(results);
                    });
            }
        }
    );
});

//用户管理，获取所有用户信息
app.post("/api/allUser", function (req, res) {
    var page = parseInt(req.body.page);
    var pageSize = parseInt(req.body.pageSize);
    var totalSize = 0; // 总条数
    var totalPage = 0; // 总页数
    var results = {};
    MongoClient.connect(
        url, {
            userNewUrlParser: true
        },
        function (err, client) {
            if (err) {
                //连接数据库失败
                results.code = -1;
                results.msg = "数据库连接失败";
                res.json(results);
                return;
            } else {
                var db = client.db("nodeProject");
                async.series(
                    [
                        function (cb) {
                            db.collection("user")
                                .find()
                                .count(function (err, num) {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        totalSize = num;
                                        cb(null);
                                    }
                                });
                        },
                        function (cb) {
                            db.collection("user")
                                .find()
                                .limit(pageSize)
                                .skip(page * pageSize - pageSize)
                                .toArray(function (err, data) {
                                    if (err) {
                                        cb(err);
                                    } else {
                                        cb(null, data);
                                    }
                                });
                        }
                    ],
                    function (err, result) {
                        if (err) {
                            results.code = -1;
                            results.msg = err.message;
                        } else {
                            totalPage = Math.ceil(totalSize / pageSize);
                            results.code = 1;
                            results.msg = "查询数据库成功";
                            results.data = {
                                info: result[1],
                                totalPage: totalPage,
                                page: page
                            };
                        }
                        client.close();
                        res.json(results);
                    }
                );
            }
        }
    );
});

//搜索
app.post("/api/searchUser", function (req, res) {
    var name = req.body.name;
    //正则匹配模糊搜索
    var filter = new RegExp(name);
    var results = {};
    MongoClient.connect(
        url, {
            userNewUrlParser: true
        },
        function (err, client) {
            if (err) {
                //连接数据库失败
                results.code = -1;
                results.msg = "数据库连接失败";
                res.json(results);
                return;
            } else {
                var db = client.db("nodeProject");
                db.collection("user")
                    .find({
                        name: filter
                    })
                    .toArray(function (err, data) {
                        if (err) {
                            //失败
                            results.code = -1;
                            results.msg = "查询失败";
                        } else {
                            // 成功
                            results.code = 1;
                            results.msg = "查询成功";
                            results.data = {
                                info: data
                            };
                        }
                        client.close();
                        res.json(results);
                    });
            }
        }
    );
});

//得到需要修改得用户数据
app.post("/api/getUserUpdate", function (req, res) {
    var id = req.body.id;
    var results = {};
    MongoClient.connect(
        url, {
            userNewUrlParser: true
        },
        function (err, client) {
            if (err) {
                //连接数据库失败
                results.code = -1;
                results.msg = "数据库连接失败";
                res.json(results);
                return;
            } else {
                var db = client.db("nodeProject");
                db.collection("user")
                    .find({
                        _id: ObjectId(id)
                    })
                    .toArray(function (err, data) {
                        if (err) {
                            //失败
                            results.code = -1;
                            results.msg = "出错啦";
                        } else {
                            // 成功
                            results.code = 1;
                            results.msg = "查询成功";
                            results.data = {
                                info: data
                            };
                        }
                        client.close();
                        res.json(results);
                    });
            }
        }
    );
});

//修改用户数据
app.post("/api/userUpdate", function (req, res) {
    var id = req.body.id;
    var userName = req.body.name;
    var pwd = req.body.pwd;
    var nicik = req.body.nicik;
    var phone = parseInt(req.body.phone);
    var age = parseInt(req.body.age);
    var sex = req.body.sex;
    var results = {};
    MongoClient.connect(
        url, {
            userNewUrlParser: true
        },
        function (err, client) {
            if (err) {
                //连接数据库失败
                results.code = -1;
                results.msg = "数据库连接失败";
                res.json(results);
                return;
            } else {
                var db = client.db("nodeProject");
                db.collection("user").updateOne({
                        _id: ObjectId(id)
                    }, {
                        $set: {
                            name: userName,
                            password: pwd,
                            nicik: nicik,
                            phone: phone,
                            age: age,
                            sex: sex
                        }
                    },
                    function (err, result) {
                        if (err) {
                            results.code = -1;
                            results.msg = "修改失败失败";
                            res.json(results);
                            client.close();
                            return;
                        } else {
                            results.code = 1;
                            results.msg = "修改成功";
                            res.json(results);
                            client.close();
                            return;
                        }
                    }
                );
            }
        }
    );
});

//删除用户
app.get("/api/userDelete", function (req, res) {
    var name = req.query.name;
    var results = {};
    MongoClient.connect(
        url, {
            userNewUrlParser: true
        },
        function (err, client) {
            if (err) {
                //连接数据库失败
                results.code = -1;
                results.msg = "数据库连接失败";
                res.json(results);
                return;
            } else {
                var db = client.db("nodeProject");
                db.collection("user").deleteOne({
                        name: name
                    },
                    function (err, data) {
                        if (err) {
                            results.code = -1;
                            results.msg = "删除失败";
                            res.json(results);
                            client.close();
                            return;
                        } else {
                            results.code = 1;
                            results.msg = "删除成功";
                            res.json(results);
                            client.close();
                            return;
                        }
                    }
                );
            }
        }
    );
});

/*
 ************************    品牌    ****************************
 */

//获取所有品牌
app.post("/api/allBrand", function (req, res) {
    var page = parseInt(req.body.page);
    var pageSize = parseInt(req.body.pageSize);
    var totalSize = 0; // 总条数
    var totalPage = 0; // 总页数
    var results = {};
    MongoClient.connect(url, {
        userNewUrlParser: true
    }, function (err, client) {
        if (err) {
            //连接数据库失败
            results.code = -1;
            results.msg = "数据库连接失败";
            res.json(results);
            return;
        } else {
            var db = client.db("nodeProject");
            async.series([function (cb) {
                db.collection("brand").find().count(function (err, num) {
                    if (err) {
                        cb(err);
                    } else {
                        totalSize = num;
                        cb(null);
                    }
                });
            }, function (cb) {
                db.collection("brand").find().limit(pageSize).skip(page * pageSize - pageSize)
                    .toArray(function (err, data) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, data);
                        }
                    });
            }], function (err, result) {
                if (err) {
                    results.code = -1;
                    results.msg = err.message;
                } else {
                    totalPage = Math.ceil(totalSize / pageSize);
                    results.code = 1;
                    results.msg = "查询数据库成功";
                    results.data = {
                        info: result[1],
                        totalPage: totalPage,
                        page: page
                    };
                }
                client.close();
                res.json(results);
            });
        }
    });
});

//新增品牌
app.post("/api/addBrand", upload.single("brandLogo"), function (req, res) {
    var filename = "images/" + new Date().getTime() + "_" + req.file.originalname;
    var newFileName = path.resolve(__dirname, "public/", filename);
    var brandName = req.body.brandName;
    var results = {};
    try {
        var data = fs.readFileSync(req.file.path);
        //写文件进public/images
        fs.writeFileSync(newFileName, data);
        //数据库操作
        MongoClient.connect(
            url, {
                useNewUrlParser: true
            },
            function (err, client) {
                if (err) {
                    //连接数据库失败
                    results.code = -1;
                    results.msg = "数据库连接失败";
                    res.json(results);
                    return;
                } else {
                    var db = client.db("nodeProject");
                    db.collection("brand").insertOne({
                            logo: filename,
                            brandName: brandName
                        },
                        function (err) {
                            // 增加成功
                            results.code = 1;
                            results.msg = "增加成功";
                            // results.data = {
                            //     info: data
                            // };
                            res.json(results);
                            client.close();
                            return;
                        }
                    );
                }
            }
        );
    } catch (error) {
        //新增手机失败
        results.code = -1;
        results.msg = "新增手机失败";
        res.json(results);
        return;
    }
});

//删除品牌
app.get("/api/brandDelete", function (req, res) {
    var id = req.query.id;
    var results = {};
    MongoClient.connect(
        url, {
            userNewUrlParser: true
        },
        function (err, client) {
            if (err) {
                //连接数据库失败
                results.code = -1;
                results.msg = "数据库连接失败";
                res.json(results);
                return;
            } else {
                var db = client.db("nodeProject");
                db.collection("brand").deleteOne({
                        _id: ObjectId(id)
                    },
                    function (err, data) {
                        if (err) {
                            results.code = -1;
                            results.msg = "删除失败";
                            res.json(results);
                            client.close();
                            return;
                        } else {
                            results.code = 1;
                            results.msg = "删除成功";
                            res.json(results);
                            client.close();
                            return;
                        }
                    }
                );
            }
        }
    );
});

//获取需要修改的品牌数据
app.post("/api/getBrandUpdate", function (req, res) {
    var id = req.body.id;
    var results = {};
    MongoClient.connect(
        url, {
            userNewUrlParser: true
        },
        function (err, client) {
            if (err) {
                //连接数据库失败
                results.code = -1;
                results.msg = "数据库连接失败";
                res.json(results);
                return;
            } else {
                var db = client.db("nodeProject");
                db.collection("brand")
                    .find({
                        _id: ObjectId(id)
                    })
                    .toArray(function (err, data) {
                        if (err) {
                            //失败
                            results.code = -1;
                            results.msg = "出错啦";
                        } else {
                            // 成功
                            results.code = 1;
                            results.msg = "查询成功";
                            results.data = {
                                info: data
                            };
                        }
                        client.close();
                        res.json(results);
                    });
            }
        }
    );
});

//修改品牌数据
app.post("/api/brandUpdate", upload.single("brandLogo"), function (req, res) {
    var filename = "images/" + new Date().getTime() + "_" + req.file.originalname;
    var newFileName = path.resolve(__dirname, "public/", filename);
    var brandName = req.body.brandName;
    var id = req.body.id;
    var results = {};
    try {
        var data = fs.readFileSync(req.file.path);
        //写文件进public/images
        fs.writeFileSync(newFileName, data);
        //数据库操作
        MongoClient.connect(
            url, {
                useNewUrlParser: true
            },
            function (err, client) {
                if (err) {
                    //连接数据库失败
                    results.code = -1;
                    results.msg = "数据库连接失败";
                    res.json(results);
                    return;
                } else {
                    var db = client.db("nodeProject");
                    db.collection("brand").updateOne({
                            _id: ObjectId(id)
                        }, {
                            $set: {
                                logo: filename,
                                brandName: brandName
                            }
                        },
                        function (err) {
                            // 增加成功
                            results.code = 1;
                            results.msg = "修改成功";
                            res.json(results);
                            client.close();
                            return;
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.log(error);
        //修改品牌失败
        results.code = -1;
        results.msg = "修改品牌失败";
        res.json(results);
        return;
    }
});


/*
 ************************    手机    ****************************
 */

//获取所有手机信息
app.post("/api/allPhone", function (req, res) {
    var page = parseInt(req.body.page);
    var pageSize = parseInt(req.body.pageSize);
    var totalSize = 0; // 总条数
    var totalPage = 0; // 总页数
    var results = {};
    MongoClient.connect(url, {
        userNewUrlParser: true
    }, function (err, client) {
        if (err) {
            //连接数据库失败
            results.code = -1;
            results.msg = "数据库连接失败";
            res.json(results);
            return;
        } else {
            var db = client.db("nodeProject");
            async.series([function (cb) {
                db.collection("phone").find().count(function (err, num) {
                    if (err) {
                        cb(err);
                    } else {
                        totalSize = num;
                        cb(null);
                    }
                });
            }, function (cb) {
                db.collection("phone").find().limit(pageSize).skip(page * pageSize - pageSize)
                    .toArray(function (err, data) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, data);
                        }
                    });
            }], function (err, result) {
                if (err) {
                    results.code = -1;
                    results.msg = err.message;
                } else {
                    totalPage = Math.ceil(totalSize / pageSize);
                    results.code = 1;
                    results.msg = "查询数据库成功";
                    results.data = {
                        info: result[1],
                        totalPage: totalPage,
                        page: page
                    };
                }
                client.close();
                res.json(results);
            });
        }
    });
});

//新增手机信息
app.post("/api/addPhone", upload.single("phoneLogo"), function (req, res) {
    var filename = "images/" + new Date().getTime() + "_" + req.file.originalname;
    var newFileName = path.resolve(__dirname, "public/", filename);
    var phoneName = req.body.phoneName;
    var phoneBrand = req.body.phoneBrand;
    var phonePrice = req.body.phonePrice;
    var phonePriceRest = req.body.phonePriceRest;
    var results = {};
    try {
        var data = fs.readFileSync(req.file.path);
        fs.writeFileSync(newFileName, data);
        //数据库操作
        MongoClient.connect(url, {
            userNewUrlParser: true
        }, function (err, client) {
            if (err) {
                //连接数据库失败
                results.code = -1;
                results.msg = "数据库连接失败";
                res.json(results);
                return;
            } else {
                var db = client.db("nodeProject");
                db.collection("phone").insertOne({
                    logo: filename,
                    phoneName: phoneName,
                    phoneBrand: phoneBrand,
                    phonePrice: phonePrice,
                    phonePriceRest: phonePriceRest
                }, function (err) {
                    // 增加成功
                    results.code = 1;
                    results.msg = "增加成功";
                    res.json(results);
                    client.close();
                    return;
                });
            }
        });
    } catch (error) {
        //新增手机失败
        results.code = -1;
        results.msg = "新增手机失败";
        res.json(results);
        return;
    }
});

//删除手机信息
app.get("/api/phoneDelete", function (req, res) {
    var id = req.query.id;
    var results = {};
    MongoClient.connect(url, {
        useNewUrlParser: true
    }, function (err, client) {
        if (err) {
            //连接数据库失败
            results.code = -1;
            results.msg = "数据库连接失败";
            res.json(results);
            return;
        } else {
            var db = client.db("nodeProject");
            db.collection("phone").deleteOne({
                    _id: ObjectId(id)
                },
                function (err, data) {
                    if (err) {
                        results.code = -1;
                        results.msg = "删除失败";
                        res.json(results);
                        client.close();
                        return;
                    } else {
                        results.code = 1;
                        results.msg = "删除成功";
                        res.json(results);
                        client.close();
                        return;
                    }
                }
            );
        }
    });
});

//获取需要修改的品牌数据
app.post("/api/getPhoneUpdate", function (req, res) {
    var id = req.body.id;
    var results = {};
    MongoClient.connect(
        url, {
            userNewUrlParser: true
        },
        function (err, client) {
            if (err) {
                //连接数据库失败
                results.code = -1;
                results.msg = "数据库连接失败";
                res.json(results);
                return;
            } else {
                var db = client.db("nodeProject");
                db.collection("phone")
                    .find({
                        _id: ObjectId(id)
                    })
                    .toArray(function (err, data) {
                        if (err) {
                            //失败
                            results.code = -1;
                            results.msg = "出错啦";
                        } else {
                            // 成功
                            results.code = 1;
                            results.msg = "查询成功";
                            results.data = {
                                info: data
                            };
                        }
                        client.close();
                        res.json(results);
                    });
            }
        }
    );
});

//修改手机信息
app.post("/api/phoneUpdate", upload.single("phoneLogo"), function (req, res) {
    var id = req.body.id;
    var filename = "images/" + new Date().getTime() + "_" + req.file.originalname;
    var newFileName = path.resolve(__dirname, "public/", filename);
    var phoneName = req.body.phoneName;
    var phoneBrand = req.body.phoneBrand;
    var phonePrice = req.body.phonePrice;
    var phonePriceRest = req.body.phonePriceRest;
    var results = {};
    try {
        var data = fs.readFileSync(req.file.path);
        //写文件进public/images
        fs.writeFileSync(newFileName, data);
        //数据库操作
        MongoClient.connect(
            url, {
                useNewUrlParser: true
            },
            function (err, client) {
                if (err) {
                    //连接数据库失败
                    results.code = -1;
                    results.msg = "数据库连接失败";
                    res.json(results);
                    return;
                } else {
                    var db = client.db("nodeProject");
                    db.collection("phone").updateOne({
                            _id: ObjectId(id)
                        }, {
                            $set: {
                                logo: filename,
                                phoneName: phoneName,
                                phoneBrand: phoneBrand,
                                phonePrice: phonePrice,
                                phonePriceRest: phonePriceRest
                            }
                        },
                        function (err) {
                            // 增加成功
                            results.code = 1;
                            results.msg = "修改成功";
                            res.json(results);
                            client.close();
                            return;
                        }
                    );
                }
            }
        );
    } catch (error) {
        console.log(error);
        //修改手机信息失败
        results.code = -1;
        results.msg = "修改手机信息失败";
        res.json(results);
        return;
    }
});

app.listen(3000);