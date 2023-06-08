
/*********************************************************************************
* WEB322 – Assignment 06
* I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part
* of this assignment has been copied manually or electronically from any other source
* (including 3rd party web sites) or distributed to other students.
*
* Name: ___Kamalakanth Vankam_____ Student ID: __101445203______ Date: __2022-04-22___
*
* Online (Heroku) Link:  https://sheltered-reef-93745.herokuapp.com/
*
********************************************************************************/
var HTTP_PORT = process.env.PORT || 8080;
var express = require("express");
var path = require("path"); 
var multer = require("multer"); 
var fs =require("fs");
var static = require("serve-static");
const exphbs = require("express-handlebars"); 
const dataServiceAuth = require("./data-service-auth.js");
const clientSessions = require("client-sessions");

var app = express();
app.use('/', static('public'));
var dataService = require("./data-service.js"); 


var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));


function onHttpStart() {
    console.log("Express http server listening on %s",HTTP_PORT); 
    
    return new Promise ((res,req)=>{
        dataService.initialize()
        .then(function(data){
            console.log(data);
         })
         .catch(function(err){
            console.log(err);
         });
    });
};

const storage = multer.diskStorage({
    destination: "./public/images/uploaded",
    filename:  (req, file, cb)=> {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });
  

const upload = multer({ storage: storage });



app.engine('.hbs',exphbs.engine({
    extname:".hbs",
    defaultLayout: 'main',
    helpers :{equal: (lvalue, rvalue, options) => 
        {
            if (arguments.length < 3)
            throw new Error("Handlebars Helper equal needs 2 parameters");
            if (lvalue != rvalue) 
            {
                return options.inverse(this);
            } else {
                return options.fn(this);
            }},
            navLink: (url, options) => 
            {
                return '<li' +((url == app.locals.activeRoute) ? ' class="active" ' : '') +'><a href="' + url + '">' + options.fn(this) + '</a></li>';}
            }  
}));

//call app.set()
app.set("view engine",".hbs"); 

app.use((req,res,next)=>{
    let route = req.baseUrl + req.path;
    app.locals.activeRoute = (route == "/") ? "/" : route.replace(/\/$/, "");
    next();
});

//user object:
const user = {
    userName: "",
    password: "",
    email: ""
};
function ensureLogin(req, res, next) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        next();
    }
};

app.use(clientSessions({
    cookieName: "session", 
    secret: "Web322A6", 
    duration: 2 * 60 * 1000, 
    activeDuration: 1000 * 60 
}));


app.use(function (req, res, next) {
    res.locals.session = req.session;
    next();
});



app.get("/", (req, res) => {
    res.render("home");
});

app.get("/about",(req,res)=>{
    res.render("about");
}); 

app.get("/images/add",ensureLogin,(req,res)=>{
    res.render("addImage"); 
}); 

app.post("/images/add",ensureLogin,upload.single("imageFile"),(req,res)=>{
    res.redirect('/images'); 
});


app.get ("/images",ensureLogin,(req,res)=>{
    fs.readdir('./public/images/uploaded',(err,files)=>
    {
    if(err){
        console.log(err);
        res.status(500).send("sever error"); 
    }
    res.render("images",{"images": files});
    }); 

}); 


app.get("/employees",ensureLogin, (req, res)=> {
    if(req.query.status)
    {
        dataService.getEmployeesByStatus(req.query.status)
       .then((data)=>
       {
        res.render("employees",{employees: data, title : "Employees"});
       })
       .catch((err)=>{
            res.render("employees", {message: "no results"});
       });
    
    }else if(req.query.department)
    {
        dataService.getEmployeesByDepartment(req.query.department)
        .then((data)=>
        {   if(data.length >0 )
          
            {res.render("employees",{employees: data, title: "Employees"});}
            else 
            {
              res.render("employees", {message: "no results"});
            }
        })
        .catch((err)=>{
          
            res.render("employees",{message: "no results"});
        });

    }else if(req.query.manager)
    {
        dataService.getEmployeesByManager(req.query.manager)
        .then((data)=>
        {   
            res.render("employees",{employees: data, title: "Employees"});
        })
        .catch((err)=>{
            
            res.render({message: "no results"});
        });

    }else
    {
        dataService.getAllEmployees()
        .then((data)=>
        {   if (data.length>0)
            {
               res.render("employees", {employees : data, title: "Employees"});
            }
            else 
            {
              res.render("employees", {message: "no results"});
            }

        })
        .catch((err)=>
        {   
            res.render("employees",{message: "no results"});
        });
    }
});

/*app.get("/employee/:num", (req, res) => {

    let viewData = {}; 
    dataService.getEmployeeByNum(req.params.num)
    .then((data)=>{
        viewData.data = data;
    })
    .catch((err)=>{
        viewData.data = null;
    })
    .then(dataService.getDepartments)
    .then((data)=>{
        viewData.departments = data;
          for(let i = 0; i < viewData.departments.length ; i++){
              if(viewData.departments[i].departmentId == viewData.data.department){
                  viewData.departments[i].selected = true;
              }
          }
    }).catch(()=>{
        viewData.departments=[]; 
    }).then (()=>{
        if(viewData.data == null){
            res.status(404).send("Employee Not Found");
        }
        else{
            res.render("employee", {
                viewData: viewData
            });
        }
    }); 
});*/

app.get("/employee/:empNum",ensureLogin, (req, res) => {
    // initialize an empty object to store the values
    let viewData = {};
    dataService.getEmployeeByNum(req.params.empNum).then((data) => {
    if (data) {
    viewData.employee = data; //store employee data in the "viewData" object as "employee"
    } else {
    viewData.employee = null; // set employee to null if none were returned
    }
    }).catch(() => {
    viewData.employee = null; // set employee to null if there was an error
    }).then(dataService.getDepartments)
    .then((data) => {
    viewData.departments = data; // store department data in the "viewData" object as "departments"
    // loop through viewData.departments and once we have found the departmentId that matches
    // the employee's "department" value, add a "selected" property to the matching
    // viewData.departments object
    for (let i = 0; i < viewData.departments.length; i++) {
    if (viewData.departments[i].departmentId == viewData.employee.department) {
    viewData.departments[i].selected = true;
    }
    }
    }).catch(() => {
    viewData.departments = []; // set departments to empty if there was an error
    }).then(() => {
    if (viewData.employee == null) { // if no employee - return an error
    res.status(404).send("Employee Not Found");
    } else {
    res.render("employee", { viewData: viewData }); // render the "employee" view
    }
    });
});


app.get("/employees/add",ensureLogin,(req,res)=>{
    dataService.getDepartments()
        .then((data)=>{
            res.render("addEmployee", {
                departments: data
            });
        })
        .catch((err)=>{
            //res.render("addEmployee",{message: "no results"});
            res.render("addEmployee", {departments: []});
        });
}); 


app.post("/employees/add",ensureLogin, (req, res)=>{
    dataService.addEmployee(req.body)
        .then((data)=>{
            console.log(req.body);
            res.redirect("/employees");
        })
        .catch((err)=>{
            console.log(err);
    })
});


app.post("/employee/update",ensureLogin, (req, res) => {
    dataService.updateEmployee(req.body)
        .then((data)=>{
            res.redirect("/employees");
           
        })
        .catch((err)=>{
            console.log(err);
            
        })
});

app.get("/departments/delete/:departmentId",ensureLogin, (req, res)=>{
    dataService.deleteDepartmentById(req.params.departmentId)
        .then((data)=>{
            res.redirect("/departments");
        })
        .catch((err)=>{
            res.status(500).send("Unable to Remove Department / Department not found")
        })
});

app.get("/managers",ensureLogin, (req, res) => {
    dataService.getManagers()
          .then((data)=>
          {
            res.render("employees", { employees: data, title: "Employees (Managers)" });
          })
          .catch((err)=>
          {
            res.render("employees",{message: "no results"});
          });
});

app.get("/departments",ensureLogin, (req, res) =>{
    dataService.getDepartments()
          .then((data)=>
           {
            if (data.length>0)
            {
                res.render("departments", { departments: data, title: "Departments" });
            }
            else 
            {
                res.render("departments",{message: "no results"});
            }
           })
          .catch((err)=>
           {
                res.render("departments",{message: "no results"});
           });
});

app.get("/departments/add",ensureLogin,(req,res)=>{
    res.render("addDepartment", {title: "Department"});
}); 

app.post("/departments/add",ensureLogin, (req, res)=>{
    dataService.addDepartment(req.body)
        .then((data)=>{
            console.log(req.body);
            res.redirect("/departments");
        })
        .catch((err)=>{
            console.log(err);
    })
});

app.post("/department/update",ensureLogin, (req, res)=> {
    dataService.updateDepartment(req.body)
    .then((data)=>{
        res.redirect("/departments");
    })
    .catch((err)=>{
        console.log(err);
    })
});

app.get("/department/:departmentId",ensureLogin, (req, res)=>{
    dataService.getDepartmentById(req.params.departmentId)
        .then((data)=>{
              res.render("department",{departments:data});
        })
        .catch((err)=>{
            res.status(404).send("Department Not Found!");
        });
});



app.get("/employee/delete/:empNum",ensureLogin, (req, res) => {
    dataService.deleteEmployeeByNum(req.params.empNum).then((data) => {

        res.redirect("/employees");
    }).catch((err) => {

        res.status(500).send("Unable to Remove Employee / Employee not found");
    });
});

//Adding new routes

app.get("/login", (req, res) => {
    res.render("login");
});


app.get("/register", (req, res) => {
    res.render("register");
})

app.post("/register", (req, res) => {
    dataServiceAuth.registerUser(req.body).then(() => {
        res.render("register", { successMessage: "User created" });
    }).catch((err) => {
        res.render("register", { errorMessage: err, userName: req.body.userName, password: req.body.password });
    })
})

// post login
app.post("/login", (req, res) => {
    req.body.userAgent = req.get('User-Agent');
    dataServiceAuth.checkUser(req.body).then((user) => {
        req.session.user = {
            userName: user.userName,
            email: user.email,
            loginHistory: user.loginHistory
        }
        res.redirect('/employees');
    }).catch((err) => {
        res.render("login", { errorMessage: err, userName: req.body.userName });
    })
});

app.get("/logout", (req, res) => {
    req.session.reset();
    res.redirect('/');
});

app.get("/userHistory", ensureLogin, (req, res) => {
    console.log(req.session.user);
    res.render("userHistory");
});


app.get('/', function (req, res, next) {
    res.render('home', {layout: false});
 });
 
app.use((err, req, res, next)=> { 
    console.error(err.stack);
    res.status(404).send("Page Not Found");
});


app.listen(HTTP_PORT, onHttpStart);

dataService.initialize()
    .then(dataServiceAuth.initialize())
    .then(function () {
        app.listen(HTTP_PORT, function () {
            console.log("app listening on: " + HTTP_PORT)
        });
    }).catch(function (err) {
        console.log("unable to start server: " + err);
    });