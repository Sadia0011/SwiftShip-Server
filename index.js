const express = require('express');
const cors = require('cors');
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require("jsonwebtoken");
const port=process.env.PORT || 5000;

const app=express();

// middleware
app.use(express.json())
app.use(cors())


const verifyJWT = (req, res, next) => {
  // console.log("inside verify token",req.headers)
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// /mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uok4zlq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const usersCollection = client.db("swiftship").collection("users");
    const BookingParcelCollection = client.db("swiftship").collection("bookingParcel");
// jwt related api
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1h",
  });

  res.send({ token });
});



// user related api
    app.get("/users",verifyJWT,async(req,res)=>{
      
      const result=await usersCollection.find().toArray();
      res.send(result)
    })

app.post("/users",async(req,res)=>{
  const user=req.body;
  console.log(user)
    const query={email:user.email}
    const existingUser=await usersCollection.findOne(query)
    if(existingUser){
      return res.send({message:"user already exists",insertedId:null})
    }
    const result=await usersCollection.insertOne(user)
    console.log(result)
    res.send(result)
})

// check user is admin or not
app.get("/users/admin/:email", verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    return res
        .status(403)
        .send({message: "forbidden access" });
  }

  const query = { email: email };
  const user = await usersCollection.findOne(query);
  let admin=false
  if(user){
    admin=user?.role === "admin" ;
  }
  res.send({admin});
});
// check user is deliveryman or not
app.get("/users/deliveryman/:email", verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    return res
        .status(403)
        .send({message: "forbidden access" });
  }

  const query = { email: email };
  const user = await usersCollection.findOne(query);
  let deliveryman=false
  if(user){
    deliveryman=user?.role === "deliveryman" ;
  }
  res.send({deliveryman});
});
// check user is user or not
app.get("/users/normalUser/:email", verifyJWT, async (req, res) => {
  const email = req.params.email;

  if (req.decoded.email !== email) {
    return res
        .status(403)
        .send({message: "forbidden access" });
  }

  const query = { email: email };
  const user = await usersCollection.findOne(query);
  let normalUser=false
  if(user){
    normalUser=user?.role === "user" ;
  }
  res.send({normalUser});
});


// get all the delivery man
app.get("/allDeliveryman",async(req,res)=>{
  const user=await usersCollection.find().toArray();
  const deliveryman=user.filter(user=>user.role=="deliveryman")
  res.send(deliveryman)
})



// get all the parcel booked
app.get("/parcelBooked", async (req, res) => {
  const count = await BookingParcelCollection.countDocuments();
  res.send({ parcelBooked: count });
});
// get all the parcel delivered
app.get("/parcelBooked", async (req, res) => {
  const count = await BookingParcelCollection.countDocuments({ status: "delivered" });
  res.send({ parcelDelivered: count });
});
// get all the registered user
app.get("/registeredUsers", async (req, res) => {
  const count = await usersCollection.countDocuments();
  res.send({ registeredUsers: count });
});


 //update user to admin
 app.patch("/users/admin/:id", async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: "admin",
    },
  };

  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);
});
//update user to deliveryman
app.patch("/users/deliveryman/:id", async (req, res) => {
  const id = req.params.id;
  //console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: {
      role: "deliveryman",
    },
  };

  const result = await usersCollection.updateOne(filter, updateDoc);
  res.send(result);
});





// bookParcel related api
app.get("/bookParcel",async(req,res)=>{
  const result=await BookingParcelCollection.find().toArray();
  res.send(result)
})

app.get("/bookParcelForOneItem/:id",async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)}
  const result=await BookingParcelCollection.findOne(query)
  res.send(result)
})
app.patch("/bookParcelForOneItem/:id",async(req,res)=>{
  const parcel=req.body
  const id=req.params.id;
  const filter={_id:new ObjectId(id)}
  const updateDoc={
    $set:{
name:parcel.name,
email:parcel.email,
phone:parcel.phone,
type:parcel.type,
weight:parcel.weight,
receiver_name:parcel.receiver_name,
receiver_phone:parcel.receiver_phone,
requested_delivery_address:parcel.requested_delivery_address,
latitude:parcel.latitude,
longtitude:parcel.longtitude,
delivery_date:parcel.delivery_date,
price:parcel.price,
status:parcel.status,
    }
  }
  const result=await BookingParcelCollection.updateOne(filter,updateDoc)
  res.send(result)
})

app.get("/bookParcel/:email",async(req,res)=>{
  const email=req.params.email;
  console.log(email)
  const query={email:email}
  const userParcel=await BookingParcelCollection.find(query).toArray();
  res.send(userParcel)
})

app.get("/parcelBooked/:email", async (req, res) => {
  const email=req.params.email;
  // console.log(email)
  const query={email:email}
  const count = await BookingParcelCollection.countDocuments(query);
  res.send({ parcelBooked: count });
});


app.post("/bookParcel",async(req,res)=>{
  const parcel=req.body;
  // console.log(parcel)
  const result=await BookingParcelCollection.insertOne(parcel)
  res.send(result)
})

app.delete("/bookParcelDelete/:id",async(req,res)=>{
  const id=req.params.id;
  const query={_id:new ObjectId(id)};
  const booking= await BookingParcelCollection.findOne(query)
  if(!booking){
    return res.status(404).json({ error: "Booking not found" });
  }
  if(booking.status !== 'pending'){
     return res.status(403).json({ error: "Cannot delete a booking with a status other than 'pending'" });
  }
  const result=await BookingParcelCollection.deleteOne(query)
  res.send(result)
})


    
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get("/",async(req,res)=>{
    res.send("SwiftShip delivery is coming to your home")
})

app.listen(port,()=>{
    console.log(`SwiftShip delivery is running on ${port}`)
})