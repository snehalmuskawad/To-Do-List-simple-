const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://admin-snehal:Test123@cluster0.lcqa4.mongodb.net/todolistDB", {useNewUrlParser: true, useUnifiedTopology: true});

//CREATING DATA, can be written as const itemsSchema = {}
const itemsSchema = {
  name: String
};

const Item = mongoose.model("Item", itemsSchema);

//CREATING DOCUMENTS
const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);


app.get("/", function(req, res) {

    //READING DATA
  Item.find({}, function(err, foundItems){
      //To make sure initial data(item1, item2, item3) is entered ony once when the to-do list is empty.
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err){
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully savevd default items to DB.");
        }
      });
      //When this redirects to app.get("/"), items.length!==0 and hence it will jump to else and render the items to our to-do list.
      res.redirect("/");
    } else {
      res.render("list", {listTitle: "Today", newListItems: foundItems}); //You can't write foundItems.name because Item.find() returns an array of JS objects.
    }
  });

});

app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName);

  //We don't want the user to go to a new custom list page every time they try to access it.
  List.findOne({name: customListName}, function(err, foundList){
    if (!err){
      if (!foundList){
        //Creating a new custom list (if it already doesn't exist)
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        //Show an existing list
        res.render("list", {listTitle: foundList.name, //You can write foundItems.name because Item.findOne() returns a single JS object.
            newListItems: foundList.items
        });
      }
    }
  });



});

app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  //If we don't do this, new items that are supposed to be added in the custom list will get added in the original 'Today' list.
  if (listName === "Today"){
    item.save();
    res.redirect("/");
  } else {
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

app.post("/delete", function(req, res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
      //DELETING DOCUMENTS(ITEMS) BY THEIR ID
    Item.findByIdAndRemove(checkedItemId, function(err){
      if (!err) {
        console.log("Successfully deleted checked item.");
        //The item will be deleted from the DB but it won't be removed from the webpage.
        //The following removes the item from the webpage.
        res.redirect("/");
      }
    });
    //It's difficult to delete a checked item from custom to-do list bc the items in the list are in an array in an embedded document.
  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      if (!err){
        res.redirect("/" + listName);
      }
    });
  }


});

app.get("/about", function(req, res){
  res.render("about");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started successfully");
});
