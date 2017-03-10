const express = require('express');
var stripe = require("stripe")("sk_test_h66OOeuyFxgyupuNsd4nc8BX");
var fs = require('fs');
const app = express();
const pgp = require('pg-promise')();
const mustacheExpress = require('mustache-express');
const bodyParser = require("body-parser");
const session = require('express-session');
const methodOverride = require('method-override');
const PS = require('pg-promise').PreparedStatement;
const PORT = process.env.PORT || 3000;
const bcrypt = require('bcrypt');




//middleware
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

//===================================routes=====================================================================================

app.get("/", function(req, res) {
    var logged_in, email, talent, sample, img, userimages;


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
        "img": img,
        
    }

    res.render('index', data);



});

app.get("/update", function(req, res) {
    res.render('update')
})

app.put("/update", function(req, res) {
    var data = req.body;

    var id = req.session.user.id;




    db.none('update usrs set email = $1,img = $2,sample=$3 where id=$4', [data.email, data.img, data.sample, id])
        .then(function() {
            res.redirect('/')
        })
        .catch(function() {
            res.render('404')
        })
})



app.get("/signup", function(req, res) {
    res.render('signup/index')
});

app.post('/signup', function(req, res) {
    var data = req.body;
    
    bcrypt.hash(data.password, 10, function(err, hash) {
        //prepared statement
        var addUser = new PS('add-user','INSERT INTO usrs(email,password,talent,sample,location,img) VALUES ($1,$2,$3,$4,$5,$6)');
        addUser.values = [data.email, hash, data.TalentType, data.samplework, data.location, data.img];
            db.none(addUser)
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
    var findUser = new PS('find-user', 'SELECT * FROM usrs WHERE email = $1', [data.email]);
    db.one(findUser)
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
      
        res.redirect('/')

    })

})

//=============================================landing page==================================================================

app.get('/landingpage', function(req, res) {


    var username = req.session.user.email;
    var id = req.session.user.id;
    var findUser = new PS('find-usa','select * from usrs where id=$1', [id]);
    db.one(findUser)
        .then(function(data) {

            res.render('landingpage', {
                'data': data
            })
        })
        .catch(function(error) {
            res.render('404')
        })


})



app.post('/friendzone', function(req, res) {
    var data = req.body
    db.many("select distinct on (email) * from usrs where talent=$1 and location=$2 and id != $3", [data.talenttype, data.location, req.session.user.id])
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
    ;
    var addFriends = new PQ('add-friends',"INSERT into friends (email,sample,uid,talent,location,fimg,fuserid) values ($1,$2,$3,$4,$5,$6,$7)");
    addFriends.values = [kata.email, kata.sample, req.session.user.id, kata.talent, kata.location, kata.img, kata.id];
    db.none(addFriends)
       .then(function() {
            res.redirect('/' );
        })
        .catch(function(error) {
            console.log(error)
            res.render('404')
        })

})

//====================================friendly stuff=================================================================================

app.get('/friendlist', function(req, res) {
    var sata = req.session.user.email;

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
app.post('/book', function(req, res) {
    var data = req.body
    console.log(data.id)
    var id = req.session.user.id
    console.log(id)
    db.none("insert into bookings (email,date,location,talent,uid,fid) values ($1,$2,$3,$4,$5,$6)", [data.email, data.date, data.location, data.talent, id, data.id])
        .then(function() {
            res.redirect('/');
        })

})

app.get('/yourbookings', function(req, res) {
    var id = req.session.user.id;
    db.any("select distinct on (email) email,date,location,talent from bookings where uid=$1", [id])
        .then(function(data) {
            res.render('yourbookings', {
                'data': data
            });
        })
})


app.get('/calender', function(req, res) {
    var id = req.session.user.id;
    db.any("select u.email,u.talent,u.location,f.date,f.bid from usrs as u inner join bookings as f on u.id = f.uid where f.fid=$1", [id])
        .then(function(data) {

            res.render('calender', {
                'data': data
            });
        })
});




//=============================================================================================
//message
//==============================================================================================================================
app.post('/message', function(req, res) {
    var data = req.body

    res.render('message', {
        'data': data
    });
})

app.post('/sendmessage', function(req, res) {
    var data = req.body;
    var id = req.session.user.id

    db.none("insert into message (uid,message,recid) values ($1,$2,$3)", [id, data.messy, data.receiverid])
        .then(function() {
            res.redirect('/')
        })
})

app.get('/MessageList', function(req, res) {
    var id = req.session.user.id;

    db.any("select u.email,m.message,m.mid,uid from usrs as u inner join message as m on m.uid = u.id where recid = $1 ", [id])
        .then(function(data) {

            res.render('MessageList', {
                'data': data
            })
        })
        .catch(function(err) {
            res.render('404')
        })

})
//===============================================================================================================================
//================================================================
//delete 
//================================================================
app.delete('/frn/:id', function(req, res) {
    console.log(req.params.id)
    db.none('delete from friends where uid = $1', [req.params.id])
        .then(function() {
            res.redirect('/')
        })
        .catch(function() {
            console.log('something went horribly wrong!!')
            res.render('404')
        })
})

app.delete('/rfrn/:id', function(req, res) {
    console.log(req.params.id)
    db.none('delete from approvedlist where uid=$1 and fuserid=$2', [req.params.id, req.session.user.id])
        .then(function() {
            res.redirect('/')
        })
        .catch(function() {
            res.render('404')
        })
})

app.delete('/deletebooking/:bid', function(req, res) {


    db.none('delete from bookings where bid=$1', [req.params.bid])
        .then(function() {
            res.redirect('/')
        })
        .catch(function(err) {
            res.render('404')
        })
})
//=======================================================================
//approved list
//====================================================================================================================
app.post('/realfriends', function(req, res) {
    var kata = req.body

    
    console.log('fuserid: ' + kata.fuserid)


    db.none("delete from friends where uid=$1", [kata.fuserid])
        .then(function() {
            db.none("insert into approvedlist (email,uid,talent,location,fimg,fuserid) values ($1,$2,$3,$4,$5,$6)", [kata.email, req.session.user.id, kata.talent, kata.location, kata.fimg, kata.fuserid])
                // db.any("select distinct on (f.email) f.email,f.sample from usrs as u inner join friends as f on u.id = f.uid where u.id=$1", [req.session.user.id])
                .then(function() {
                   

                    res.redirect('/');
                })
                .catch(function(error) {
                    console.log(error)
                    res.send('something went wrong')
                })

        })
        .catch(function() {
            console.log('something went horribly wrong!!')
        })




})

app.get('/realfriends', function(req, res) {


    db.any("select distinct on (email,gmail) u.id,u.email,u.img,u.talent,u.location as uloc,a.uid,a.fuserid as fuserid,a.email as gmail,a.location as flocation,a.talent as ftalent from usrs as u inner join approvedlist as a on u.id = a.uid where a.uid=$1 or a.fuserid=$2;", [req.session.user.id, req.session.user.id])
        .then(function(data) {
            console.log(data);
            var kata = [];
            for (var i = 0; i < data.length; i++) {
                if (req.session.user.id !== data[i].uid) {

                    var ghata = {
                        'talent': data[i].talent,
                        'email': data[i].email,
                        'location': data[i].uloc,
                        'id': data[i].uid

                    }
                    kata.push(ghata)
                } else if (req.session.user.id !== data[i].fuserid) {

                    var ghata = {
                        'talent': data[i].ftalent,
                        'email': data[i].gmail,
                        'location': data[i].flocation,
                        'id': data[i].fuserid
                    }
                    kata.push(ghata)
                
                }

               
            } //for ends
            res.render('realfriends', {
                'data': kata
            })
        })
        .catch(function(error) {
            console.log(error)
            res.render('404')
        })
})

//===========================================================================================================================
//================================================================================ads====================================
app.get('/adform', function(req, res) {
    res.render('adform')
})

app.post('/postads', function(req, res) {
    console.log(req.body)
    var data = req.body
    console.log(data.date)
    db.none("insert into adpost (email,ad,location,talent,uid,date) values ($1,$2,$3,$4,$5,$6)", [data.email, data.ad, data.location, data.talent, req.session.user.id, data.date])
        .then(function() {
            res.redirect('/')
        })
        .catch(function(err) {
            console.log(err);
            res.render('404')
        })
})

app.get('/postads', function(req, res) {
    db.any("select * from adpost")
        .then(function(data) {
            console.log(data)
            res.render('adpost', {
                data: data
            })
        })
})
//=====================================================================================================================

//=================================unavailable dates===================================================================
app.post('/unavailabledates', function(req, res) {
    var data = req.body
    console.log(data)
    db.any("select date from bookings where fid=$1", [data.id])
        .then(function(data) {
            console.log(data)
            res.render('unavailabledates', {
                'data': data
            });
        })
        .catch(function() {
            res.render('404')
        })
})
//=====================================================================================================================



var t = new Date();
var h = t.getHours();
var m = t.getMinutes();

app.listen(3000, function() {
    console.log('you are listening on port 3000! time is: ' + '' + h + ':' + m);
});