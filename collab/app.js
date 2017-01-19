const express = require('express');
var stripe = require("stripe")("sk_test_h66OOeuyFxgyupuNsd4nc8BX");

const app = express();
const pgp = require('pg-promise')();
const mustacheExpress = require('mustache-express');
const bodyParser = require("body-parser");
const session = require('express-session');
const methodOverride = require('method-override')

/* BCrypt stuff here */
const bcrypt = require('bcrypt');

app.engine('html', mustacheExpress());
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use("/", express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
app.use(methodOverride('_method'))

app.use(session({
    secret: 'do not blink',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false
    }
}))

var db = pgp('postgres://pmk00:passwrd@localhost:5432/users');

app.get("/", function(req, res) {
    var logged_in, email, talent, sample,img;
    
    if (req.session.user) {
        logged_in = true;
        email = req.session.user.email;
        talent = req.session.user.talent;
        sample = req.session.user.sample;
        img = req.session.user.img;
    }

    var data = {
        "logged_in": logged_in,
        "email": email,
        "talent": talent,
        "sample": sample,
        "img":img
    }
    
    res.render('index', data);



});

app.get("/update", function(req, res) {
    res.render('update')
})

app.put("/update",function(req,res){
    var data = req.body;
    
    var id = req.session.user.id;
    

    

    db.none('update usrs set email = $1,img = $2 where id=$3',[data.email,data.img,id]).then(function(){
        res.redirect('/')
    })
})



app.get("/signup", function(req, res) {
    res.render('signup/index')
});

app.post('/signup', function(req, res) {
    var data = req.body;
    

    bcrypt.hash(data.password, 10, function(err, hash) {

        db.none(

                "INSERT INTO usrs(email,password,talent,sample,location,img) VALUES ($1,$2,$3,$4,$5,$6)", [data.email, hash, data.TalentType, data.samplework, data.location,data.img]
            )
            .then(function() {
                res.redirect('/');
            })
            .catch(function(error) {
                console.log(error)

            })
    });
})

app.post('/login', function(req, res) {
    var data = req.body;
    
    db.one(
            "SELECT * FROM usrs WHERE email = $1", [data.email]
        )
        .catch(function() {
            res.send('Email/Password never found.')
        })
        .then(function(user) {
            bcrypt.compare(data.password, user.password, function(err, cmp) {
                if (cmp) {
                    req.session.user = user;
                    res.redirect('/');
                } else {
                    res.send('Email/Password not found.')
                }
            });
        });
});

app.get('/logout', function(req, res) {
    req.session.destroy(function(err) {
        // cannot access session here
        res.redirect('/')

    })

})

app.get('/landingpage', function(req, res) {


    var username = req.session.user.email
    var email = req.session.user.id

    db.one("select * from usrs where id=$1", [email])
        .then(function(data) {

            res.render('landingpage', data)
        })
        .catch(function(error) {
            res.send('no data')
        })


})



app.post('/friendzone', function(req, res) {
    var data = req.body;

    db.many("select * from usrs where talent=$1 and location=$2", [data.talenttype, data.location])
        .then(function(data) {


            res.render('friendzone', {
                'data': data
            })


        })
        .catch(function(error) {
            res.render('friendzone')
        })

})


app.post('/single', function(req, res) {
    var kata = req.body
    // console.log(kata);
    // console.log(req.session.user)

    db.none("insert into friends (email,sample,uid,talent,location,fimg) values ($1,$2,$3,$4,$5,$6)", [kata.email, kata.sample, req.session.user.id,kata.talent,kata.location,kata.img])
    // db.any("select distinct on (f.email) f.email,f.sample from usrs as u inner join friends as f on u.id = f.uid where u.id=$1", [req.session.user.id])
        .then(function() {
            
            res.redirect('/'//, {
                // 'data': data
            //}
            );
        })
        .catch(function(error) {
            console.log(error)
        })

})

app.get('/friendlist', function(req, res) {
    var sata = req.session.user.email
    
    db.any("select distinct on (f.email) f.email,f.sample,f.talent,f.location,f.fimg from usrs as u inner join friends as f on u.id = f.uid where u.id=$1", [req.session.user.id])
        .then(function(data) {
            console.log(data)
            res.render('friendlist', {
                'data': data
            });
        })
        .catch(function(error) {
            console.log(error)
        })
})

app.get('/frn/:id', function(req, res) {
    var frnid = req.params.id

    db.one("select * from usrs where id=$1", [frnid])
        .then(function(data) {

            res.render('frn', {
                'data': data
            })
        })
        .catch(function(error) {
            console.log(error)
        })
})


app.get('/charge', function(req, res) {
    res.render('charge')
})

//https://stripe.com/docs/quickstart
app.post('/charge', function(req, res) {
    var token = req.body.stripeToken;
    var chargeAmount = req.body.chargeAmount
    var charge = stripe.charges.create({
        amount: chargeAmount,
        currency: "usd",
        description: "Example charge",
        source: token
    }, function(err, charge) {
        if (err & err.type === "StripeCardError") {
            console.log("card declined")
        }


    });
    console.log("payment success")
    res.send('pay succeded');

});
//=============================================================================================
//bookings
//=============================================================================================
  app.post('/book',function(req,res){
    var data = req.body
    console.log(data.id)
    var id = req.session.user.id
    console.log(id)
    db.none("insert into bookings (email,date,location,talent,uid,fid) values ($1,$2,$3,$4,$5,$6)",[data.email,data.date,data.location,data.talent,id,data.id])
    .then(function(){
        res.redirect('/');
    })

  })

  app.get('/yourbookings',function(req,res){
    var id = req.session.user.id;
    db.any("select distinct on (email) email,date,location,talent from bookings where uid=$1",[id])
    .then(function(data){
        res.render('yourbookings',{'data':data});
    })
  })


  app.get('/calender',function(req,res){
    var id = req.session.user.id;
    db.any("select u.email,u.talent,u.location,f.date from usrs as u inner join bookings as f on u.id = f.uid where f.fid=$1",[id])
    .then(function(data){
        console.log(data);
        res.render('calender',{'data':data});
    })
  })
  ;


//=============================================================================================
//message
//==============================================================================================================================
    app.post('/message',function(req,res){
        var data = req.body
        
        res.render('message',{'data':data});
    })

    app.post('/sendmessage',function(req,res){
        var data = req.body;
        var id=req.session.user.id
        
        db.none("insert into message (uid,message,recid) values ($1,$2,$3)",[id,data.messy,data.receiverid])
        .then(function(){
            res.redirect('/')
        })
    })

    app.get('/MessageList',function(req,res){
        var id=req.session.user.id;

        db.any("select u.email,m.message,m.mid,uid from usrs as u inner join message as m on m.uid = u.id where recid = $1 ",[id])
        .then(function(data){
            
            res.render('MessageList',{'data':data})
        }).catch(function(err){
            res.send('something went horribly wrong!!')
        })

    })
//===============================================================================================================================

var t = new Date();
var h = t.getHours(); 
var m = t.getMinutes();
app.listen(3000, function() {
    console.log('you are listening on port 3000! time is: '+ ''+ h +':'+m);
});