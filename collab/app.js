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
    }).catch(function(){res.render('404')})
})



app.get("/signup", function(req, res) {
    res.render('signup/index')
});

app.post('/signup', function(req, res) {
    var data = req.body;
    console.log(data);
  
   bcrypt.hash(data.password, 10, function(err, hash) {

        // read in image in raw format (as type Buffer):
    
    // inserting data into column 'userimages' of type 'bytea':
     db.none(

                "INSERT INTO usrs(email,password,talent,sample,location,img,userimages) VALUES ($1,$2,$3,$4,$5,$6,$7)", [data.email, hash, data.TalentType,data.samplework, data.location,data.img,data.imgfile]
            )
            .then(function() {
                res.redirect('/');
            })
            .catch(function(error) {
                console.log(error)
                res.render('404')

            })
          


       
    });
})

app.post('/login', function(req, res) {
    var data = req.body;
    
    db.one(
            "SELECT * FROM usrs WHERE email = $1", [data.email]
        )
        .catch(function() {
            res.render('404')
        })
        .then(function(user) {
            bcrypt.compare(data.password, user.password, function(err, cmp) {
                if (cmp) {
                    req.session.user = user;
                    res.redirect('/');
                } else {
                    res.render('404')
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

            res.render('landingpage', {'data':data})
        })
        .catch(function(error) {
            res.render('404')
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
            res.render('404')
        })

})

//====================================friendly shit=================================================================================

app.get('/friendlist', function(req, res) {
    var sata = req.session.user.email
    
    db.any("select distinct on (u.email) u.email,u.sample,u.talent,u.location,u.img,f.fuserid,u.id from usrs as u inner join friends as f on u.id = f.uid where f.fuserid=$1", [req.session.user.id])
        .then(function(data) {
            console.log(data);
            res.render('friendlist', {
                'data': data
            });
        })
        .catch(function(error) {
            console.log(error)
            res.render('404')
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
            res.render('404')
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
            res.render('404')
        })

    })
//===============================================================================================================================
//================================================================
//delete 
//================================================================
app.delete('/frn/:id',function(req,res){
    console.log(req.params.id)
    db.none('delete from friends where uid = $1',[req.params.id])
    .then(function(){
        res.redirect('/')
    }).catch(function(){
        console.log('something went horribly wrong!!')
        res.render('404')
    })
})

app.delete('/rfrn/:id',function(req,res){
    console.log(req.params.id)
    db.none('delete from approvedlist where uid=$1 and fuserid=$2',[req.params.id,req.session.user.id])
    .then(function(){
        res.redirect('/')
    }).catch(function(){
        res.render('404')
    })
})

app.delete('/delbok',function(req,res){
    db.none('delete from bookings where ')
})
//=======================================================================
//approved list
//====================================================================================================================
app.post('/realfriends',function(req,res){
   var kata = req.body
    
    // console.log(req.session.user)
    console.log('fuserid: '+kata.fuserid)
    

    db.none("delete from friends where uid=$1",[kata.fuserid])
    .then(function(){
        db.none("insert into approvedlist (email,uid,talent,location,fimg,fuserid) values ($1,$2,$3,$4,$5,$6)", [kata.email, req.session.user.id,kata.talent,kata.location,kata.fimg,kata.fuserid])
    // db.any("select distinct on (f.email) f.email,f.sample from usrs as u inner join friends as f on u.id = f.uid where u.id=$1", [req.session.user.id])
        .then(function() {
    //         db.any("select u.email,f.email,u.talent,f.fuserid from usrs as u inner join approvedlist as f on u.id = f.fuserid where f.uid = $1 or f.fuserid=$2",[req.session.user.id,kata.fuserid])
    // .then(function(data){
    //     res.render('realfriends',{'data':data});
    // }).catch(function(error){
    //     console.log(error)
    //     res.send('somethign went wrong')
    // })
            
            res.redirect('/');
        })
        .catch(function(error) {
            console.log(error)
            res.send('something went wrong')
        })
        
    })
    .catch(function(){
        console.log('something went horribly wrong!!')
                    })

    


})

app.get('/realfriends',function(req,res){
    
    
    db.any("select distinct on (email,gmail) u.id,u.email,u.img,u.talent,u.location as uloc,a.uid,a.fuserid as fuserid,a.email as gmail,a.location as flocation,a.talent as ftalent from usrs as u inner join approvedlist as a on u.id = a.uid where a.uid=$1 or a.fuserid=$2;",[req.session.user.id,req.session.user.id])
    .then(function(data){
        console.log(data);
        var kata = [];
    for(var i=0;i<data.length;i++){
        if (req.session.user.id!==data[i].uid){
            
            var ghata={'talent':data[i].talent,
                      'email':data[i].email,
                      'location':data[i].uloc,
                      'id':data[i].uid
                      
                        }
            kata.push(ghata)
                }
        else if(req.session.user.id!==data[i].fuserid){
            
            var ghata={'talent':data[i].ftalent,
                      'email':data[i].gmail,
                      'location':data[i].flocation,
                      'id':data[i].fuserid
                        }
                        kata.push(ghata)
                //res.render('realfriends',{'data':data})
        }

        // res.render('realfriends',{'data':kata});
    }//for ends
    res.render('realfriends',{'data':kata})}).catch(function(error){
        console.log(error)
        res.render('404')
    })
})

//===========================================================================================================================
//================================================================================ads====================================
app.get('/adform',function(req,res){
    res.render('adform')
})

app.post('/postads',function(req,res){
    console.log(req.body)
    var data = req.body
    db.none("insert into adpost (email,ad,location,talent,uid) values ($1,$2,$3,$4,$5)",[data.email,data.ad,data.location,data.talent,req.session.user.id])
    .then(function(){
        res.redirect('/')
    }).catch(function(err){
        console.log(err);
        res.render('404')
    })
})

app.get('/postads',function(req,res){
    db.any("select * from adpost")
    .then(function(data){
        res.render('adpost',{data:data})
    })
})
//=====================================================================================================================

//=================================unavailable dates===================================================================
    app.post('/unavailabledates',function(req,res){
        var data = req.body
        console.log(data)
        db.any("select date from bookings where fid=$1",[data.id])
        .then(function(data){
            console.log(data)
            res.render('unavailabledates',{'data':data});
        }).catch(function(){
            res.render('404')
        })
    })
//=====================================================================================================================



var t = new Date();
var h = t.getHours(); 
var m = t.getMinutes();
app.listen(3000, function() {
    console.log('you are listening on port 3000! time is: '+ ''+ h +':'+m);
});