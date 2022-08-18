let express = require('express');
let app = express();
let bodyParser = require('body-parser');
let cors = require('cors')
let dotenv = require('dotenv');
dotenv.config()
let port = process.env.PORT || 9870;
let mongo = require('mongodb');
let mongoClient = mongo.MongoClient;
let mongoUrl = process.env.MongoLiveUrl;
let db;
let jwt = require('jsonwebtoken');
let bcrypt = require('bcrypt');
let config = require('./config');

//Connection with db
mongoClient.connect(mongoUrl,(err,client) => {
  if(err) console.log(`Error While Connecting`);
  db = client.db("letstalk");
  app.listen(port,(err) => {
    if(err) throw err;
    console.log(`Express Server listening on port ${port}`)
  })
})

app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())
app.use(cors())

app.get('/',(req,res) => {
    res.send('Express Server default')
})

app.get('/users',(req,res) => {
  db.collection('users').find().toArray((err,result) => {
      if(err) throw err;
      res.send(result)
    })
})

//register User
app.post('/register', (req,res) => {
    const hashPassword =  bcrypt.hashSync(req.body.password, 8)
    
    //unique details implementation

    db.collection('users').insertOne({
        name:req.body.name,
        email:req.body.email,
        password:hashPassword
    },(err,data) => {
        if(err) return res.status(500).send('Error While Register');
        res.status(200).send('Registration Succesful')
    })
  })

  ///login Users
  app.post('/login',(req,res) => {
    db.collection('users').findOne({email:req.body.email_login},(err,user) => {
        if(err) return res.send({auth:false,token:'Error While Login'})
        if(!user) return res.send({auth:false,token:'No User Found Register First'})
        else{
            const passIsValid = bcrypt.compareSync(req.body.password_login,user.password)
            if(!passIsValid) return res.send({auth:false,token:'Invalid Password'})
            // in case email and password both good than generate token
            let token = jwt.sign({id:user._id},config.secret,{expiresIn:86400}) // 24 hours
            return res.send({auth:true,token:token})
        }
    })
  })

  //userinfo
app.get('/userInfo',(req,res) => {
  let token = req.headers['x-access-token'];
  if(!token) res.send({auth:false,token:'No Token Provided'})
  // jwt verify token
  jwt.verify(token,config.secret,(err,user) => {
      if(err) return res.send({auth:false,token:'Invalid Token'})
      db.collection('users').findOne({"_id":mongo.ObjectId(user.id)},(err,result) => {
        res.send(result)
    })

  })
})

app.get('/retrieveposts', (req, res) => {
  db.collection('posts').find().toArray((err,data)=>{
      if (err){
          res.status(500).send(err)
      } else {
          data.sort((b,a) => {
              return a.timestamp - b.timestamp;
          })

          res.status(200).send(data)
      }
  })
})

//add post User
app.post('/addpost', (req,res) => {
  
  //unique details implementation

  db.collection('posts').insertOne({
      name:req.body.name,
      email:req.body.email,
      timestamp:req.body.timestamp,
      postdetails:req.body.postdetails
  },(err,data) => {
      if(err) return res.status(500).send('Error Creating Post');
      res.status(200).send('Post Created Successfully')
  })
})