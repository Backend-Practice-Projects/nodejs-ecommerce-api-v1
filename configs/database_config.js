const mongoose = require("mongoose");
const dbConfiguration = () => {
  mongoose.connect(process.env.MONGODB_URI).then((mongoose) => {
    console.log(
      `Database connected successfully: ${mongoose.connection.host} 🚀`,
    );
  });
  // .catch((error) => {
  //   console.error("Database connection failed ❌", error.message);
  //   // Exit process with failure
  //   process.exit(1);
  // });
};

module.exports = dbConfiguration;
