const express = require('express');
var stripe = require("stripe")("sk_test_h66OOeuyFxgyupuNsd4nc8BX");
 var fs = require('fs');
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
//base 64
//========================================================================================================================
// var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9+/=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/rn/g,"n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=c1=c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}

//========================================================================================================================

app.get("/", function(req, res) {
    var logged_in, email, talent,sample,img,userimages;
  
    
    if (req.session.user) {
        logged_in = true;
        email = req.session.user.email;
        talent = req.session.user.talent;
        // decoded = Base64.decode(req.session.user.sample);
        //==============
        var im = req.session.userimages;
        if (im && FileReader && FileList && Bytea) {
              
               var reader  = new FileReader();
                var image =  reader.readAsDataURL(im);}
           
       
        //==============
        sample = req.session.user.sample;
        img = req.session.user.img;
        userimages = image
    }

    var data = {
        "logged_in": logged_in,
        "email": email,
        "talent": talent,
        "sample": sample,
        "img":img,
        "userimages":image
    }
    
    res.render('index', data);



});

app.get("/update", function(req, res) {
    res.render('update')
})

app.put("/update",function(req,res){
    var data = req.body;
    
    var id = req.session.user.id;
    

    

    db.none('update usrs set email = $1,img = $2,sample=$3 where id=$4',[data.email,data.img,data.sample,id]).then(function(){
        res.redirect('/')
    })
})



app.get("/signup", function(req, res) {
    res.render('signup/index')
});

app.post('/signup', function(req, res) {
    var data = req.body;
    console.log(data);
    // var vio = data.samplework.split(' ');
    // var video = vio[3].slice(3,vio[3].length)
    
    // // var encoded = Base64.encode(video);
   


   

    

    bcrypt.hash(data.password, 10, function(err, hash) {

        // read in image in raw format (as type Buffer):
        fs.readFile(data.imgfile, function (err, imgData) {
    // inserting data into column 'userimages' of type 'bytea':
     db.none(

                "INSERT INTO usrs(email,password,talent,sample,location,img,userimages) VALUES ($1,$2,$3,$4,$5,$6,$7)", [data.email, hash, data.TalentType,data.samplework, data.location,data.img,data.imgfile]
            )
            .then(function() {
                res.redirect('/');
            })
            .catch(function(error) {
                console.log(error)

            })
          
});

       
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

//=============================================landing page==================================================================

app.get('/landingpage', function(req, res) {


    var username = req.session.user.email;
    var email = req.session.user.id;

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

    db.many("select distinct on (email) * from usrs where talent=$1 and location=$2", [data.talenttype, data.location])
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


    db.none("insert into friends (email,sample,uid,talent,location,fimg,fuserid) values ($1,$2,$3,$4,$5,$6,$7)", [kata.email, kata.sample, req.session.user.id,kata.talent,kata.location,kata.img,kata.id])
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

//====================================friendly shit=================================================================================

app.get('/friendlist', function(req, res) {
    var sata = req.session.user.email
    
    db.any("select distinct on (f.email) f.email,f.sample,f.talent,f.location,f.fimg,f.fuserid from usrs as u inner join friends as f on u.id = f.uid where u.id=$1", [req.session.user.id])
        .then(function(data) {
            console.log(data.fimg)
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

//============================================================================================================================
//charge
//============================================================================================================================

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
//================================================================
//delete 
//================================================================
app.delete('/frn/:id',function(req,res){
    
    db.none('delete from friends where fuserid = $1',[req.params.id])
    .then(function(){
        res.redirect('/')
    }).catch(function(){
        console.log('something went horribly wrong!!')
    })
})
//=======================================================================
//approved list
//====================================================================================================================
app.post('/realfriends',function(req,res){
   var kata = req.body
    // console.log(kata);
    // console.log(req.session.user)
    console.log(kata)
    db.none("delete from friends where fuserid=$1",[kata.fuserid]).then(function(){}).catch(function(){console.log('something went horribly wrong!!')})
    db.none("insert into approvedlist (email,uid,talent,location,fimg,fuserid) values ($1,$2,$3,$4,$5,$6)", [kata.email, req.session.user.id,kata.talent,kata.location,kata.fimg,kata.id])
    // db.any("select distinct on (f.email) f.email,f.sample from usrs as u inner join friends as f on u.id = f.uid where u.id=$1", [req.session.user.id])
        .then(function() {
            
            res.redirect('/');
        })
        .catch(function(error) {
            console.log(error)
            res.send('something went wrong')
        })


})
app.get('/realfriends',function(req,res){
    db.any("select * from approvedlist where uid=$1",[req.session.user.id])
    .then(function(data){
        res.render('realfriends',{'data':data});
    }).catch(function(error){
        console.log(error)
        res.send('somethign went wrong')
    })
})

//===========================================================================================================================





var t = new Date();
var h = t.getHours(); 
var m = t.getMinutes();
app.listen(3000, function() {
    console.log('you are listening on port 3000! time is: '+ ''+ h +':'+m);
});