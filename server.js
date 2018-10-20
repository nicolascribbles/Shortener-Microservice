'use strict';
const jQuery = require('jquery');
const express = require('express');
const mongodb = require('mongodb');
const validUrl = require('valid-url');
const shortid = require('shortid');
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$&');

var fs = require('fs');
const path = require('path');
const app = express();

var MongoClient = mongodb.MongoClient;

var DB_NAME = 'nicolascribblesurlshort';
var DB_URL = 'mongodb://' + process.env.DB_USER + ':' + process.env.DB_PASS + '@ds055709.mlab.com:55709/'+DB_NAME;
var DOMAIN = 'https://shrtme.glitch.me/';

// Basic Configuration 
var PORT = process.env.PORT || 3000;

/** this project needs a db !! **/ 
MongoClient.connect(DB_URL);
app.route('/_api/package.json')
  .get(function(req, res, next) {
    console.log('requested');
    fs.readFile(__dirname + '/package.json', function(err, data) {
      if(err) return next(err);
      res.type('txt').send(data.toString());
    });
});


app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});
app.use('/public', express.static(process.cwd() + '/public'));




//JSON Objects & Logic
app.route('/new/:url(*)')
    .get( (req,res, next) => {
  //connect to database
  MongoClient.connect(DB_URL, (err, db) => {
        if (err) {
          console.log("Unable to connect to server", err);
        } else {
          //console.log("Connected to server");
          let collection = db.collection('links');
          let url = req.params.url;
          let host = "http://shrtme.glitch.me/"
          
          //function to generate short link 
          let generateLink = function(db, callback) {
            //check if url is valid
            if (validUrl.isUri(url)){
              collection.findOne({"url": url}, {"short": 1, "_id": 0}, (err, doc) =>{
                if(doc != null){
                  res.json({
                  "original_url": url, 
                  "short_url":host + doc.short
                });
                }
                else{
                   //generate a short code
                    let shortCode = shortid.generate();
                    let newUrl = { url: url, short: shortCode };
                    collection.insert([newUrl]);
                      res.json({
                        "original_url":url, 
                        "short_url":host + shortCode
                      });
                }
              });
            } 
            else {
                console.log('Not a URI');
                res.json({
                  "error": "Invalid url"
                })
            }
          };
          
          generateLink(db, function(){
            db.close();
          });
        }
  }); 
});

//given short url redirect to original url
app.route('/:short')
    .get( (req,res, next) => {
  MongoClient.connect(DB_URL, (err,db) => {
    if (err) {
          console.log("Unable to connect to server", err);
        } else {
          let collection = db.collection('links');
          let short = req.params.short;
          
          //search for original url in db and redirect the browser
          collection.findOne({"short": short}, {"url": 1, "_id": 0}, (err, doc) => {
            if (doc != null) {
              res.redirect(doc.url);
            } else {
              res.json({ error: "Shortlink not found in the database." });
            };
          });
        }
    db.close();
  });
});

// Respond not found to all the wrong routes
app.use(function(req, res, next){
  res.status(404);
  res.type('txt').send('Not found');
});

// Error Middleware
app.use(function(err, req, res, next) {
  if(err) {
    res.status(err.status || 500)
      .type('txt')
      .send(err.message || 'SERVER ERROR');
  }  
})

app.listen(process.env.PORT, function () {
  console.log('Node.js listening ...');
});
