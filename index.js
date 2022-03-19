const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");
require("dotenv").config();

const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

app.get("/", (req, res) => {
  res.send("Running");
});

let peers = [];
const broadcastEventTypes = {
  ACTIVE_USERS: "ACTIVE_USERS",
  GROUP_CALL_ROOMS: "GROUP_CALL_ROOMS",
};
io.on("connection", (socket) => {
  socket.emit("me", socket.id);
  console.log("new user connected");
  console.log(socket.id);
  socket.on("disconnect", () => {
    console.log("user disconnected");
    peers = peers.filter((peer) => peer.socketId !== socket.id);
    io.sockets.emit("broadcast", peers);
  });
  socket.on("register-new-user", (data) => {
    let flag = true;
    peers.map((peer, index) => {
      if (peer.userId === data.userId) {
        peers.splice(index, 1, data);
        flag = false;
      }
    });
    if (flag) peers.push(data);
    console.log(peers);
    io.sockets.emit("broadcast", peers);
  });
  socket.on(
    "callUser",
    ({ userToCall, signalData, from, name, localStream }) => {
      console.log({ userToCall, signalData, from, name, localStream });
      io.to(userToCall).emit("callUser", {
        signal: signalData,
        from,
        name,
        localStream,
      });
    }
  );

  socket.on("videoOther", (data) => {
    io.to(data.socketId).emit("videoOther", data.status);
  });
  socket.on("startCount", (data) => {
    io.to(data.socketId).emit("startCount", data.status);
  });
  socket.on("missCall", (data) => {
    io.to(data.socketId).emit("missCall", data);
  });
  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });
  socket.on("endCall", (data) => {
    io.to(data.socketId).emit("endCall", data);
  });
  socket.on("addFriend", (data) => {
    io.to(data.socketId).emit("addFriend", data);
  });
  socket.on("deleteRequestAddFriend", (data) => {
    io.to(data.socketId).emit("deleteRequestAddFriend", data);
  });
  socket.on("sendMessage", (data) => {
    io.to(data.socketId).emit("sendMessage", data);
  });
  socket.on("sendReaction", (data) => {
    io.to(data.socketId).emit("sendReaction", data);
  });
  socket.on("pushNotification", (data) => {
    io.to(data.socketId).emit("pushNotification", data);
  });
  socket.on("inputting", (data) => {
    io.to(data.socketId).emit("inputting", data);
  });
  socket.on("stopInput", (data) => {
    io.to(data.socketId).emit("stopInput", data);
  });

  socket.on("callGroup", (data) => {
    console.log(data.signalData);
    data.socketIds.forEach((socketId) => {
      io.to(socketId.socketId).emit("callGroup", data);
    });
  });
  socket.on("answerCallGroup", (data) => {
    io.to(data.to).emit("callAcceptedGroup", data);
  });

  socket.on("joinGroup", (data) => {
    console.log("join group", data);
    data.allMembers.forEach((member) => {
      if (member.userId !== data.userJoin)
        io.to(member.socketId).emit("joinGroup", data);
    });
  });
  socket.on("participants", (data) => {
    data.allMembers.forEach((member) => {
      // if (member.userId !== data.userJoin)
      io.to(member.socketId).emit("participants", data);
    });
  });

  socket.on("endCallGroup", (data) => {
    console.log("end call group", data);
    data.forEach((member) => {
      io.to(member.socketId).emit("endCallGroup", data);
    });
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log(process.env.PORT);
  console.log(`Server is running on port 3000`);
});
