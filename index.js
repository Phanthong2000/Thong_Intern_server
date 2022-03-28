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
const users = {};

const socketToRoom = {};
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
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    console.log({
      userToCall,
      signalData,
      from,
      name,
    });
    io.to(userToCall).emit("callUser", {
      signal: signalData,
      from,
      name,
    });
  });

  socket.on("videoOther", (data) => {
    console.log("video other");
    io.to(data.socketId).emit("videoOther", data.status);
  });
  socket.on("audioOther", (data) => {
    console.log("audio other");
    io.to(data.socketId).emit("audioOther", data.status);
  });
  socket.on("startCount", (data) => {
    io.to(data.socketId).emit("startCount", data.status);
  });
  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });
  socket.on("endCall", (data) => {
    io.to(data.socketId).emit("endCall", data);
  });
  socket.on("missCall", (data) => {
    io.to(data.socketId).emit("missCall", data);
  });
  socket.on("addFriend", (data) => {
    io.to(data.socketId).emit("addFriend", data);
  });
  socket.on("deleteRequestAddFriend", (data) => {
    io.to(data.socketId).emit("deleteRequestAddFriend", data);
  });
  socket.on("confirmRequestAddFriend", (data) => {
    io.to(data.socketId).emit("confirmRequestAddFriend", data);
  });
  socket.on("unFriend", (data) => {
    io.to(data.socketId).emit("unFriend", data);
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
  socket.on("deleteInputting", (data) => {
    io.to(data.socketId).emit("deleteInputting", data);
  });
  socket.on("inputtingGroup", (data) => {
    console.log("inputting", data);
    data.socketIds.forEach((socketId) => {
      io.to(socketId).emit("inputting", data);
    });
  });
  socket.on("deleteInputtingGroup", (data) => {
    data.socketIds.forEach((socketId) => {
      io.to(socketId).emit("deleteInputting", data);
    });
  });
  socket.on("createChatboxGroup", (data) => {
    data.socketIds.forEach((socketId) => {
      io.to(socketId.socketId).emit("loadChatbox", socketId.userId);
    });
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

  socket.on("join room", (data) => {
    console.log(" join room");
    if (users[data.roomId]) {
      const length = users[data.roomId].length;
      if (length === 5) {
        socket.emit("room full");
        return;
      }
      users[data.roomId].push({
        socketId: socket.id,
        userJoin: data.userJoin,
      });
    } else {
      users[data.roomId] = [
        {
          socketId: socket.id,
          userJoin: data.userJoin,
        },
      ];
    }
    socketToRoom[socket.id] = data.roomId;
    const usersInThisRoom = users[data.roomId].filter(
      (id) => id.socketId !== socket.id
    );
    console.log("usersin this room", usersInThisRoom);
    socket.emit("all users", {
      users: usersInThisRoom,
      userJoin: data.userJoin,
    });
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
      userJoin: payload.userJoin,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });
  socket.on("invite join room", (data) => {
    data.socketIds.forEach((socketId) => {
      io.to(socketId).emit("invite join room", data);
    });
  });
  socket.on("stop room", (roomID) => {
    users[roomID].forEach((user) => {
      io.to(user.socketId).emit("stop room", roomID);
    });
  });
  socket.on("cede host", (data) => {
    users[data.roomId].forEach((user) => {
      io.to(user.socketId).emit("cede host", data);
    });
  });
  socket.on("turn on video room", (data) => {
    users[data.roomId].forEach((user) => {
      io.to(user.socketId).emit("turn on video room", data.userTurnOn);
    });
  });
  socket.on("turn off video room", (data) => {
    users[data.roomId].forEach((user) => {
      io.to(user.socketId).emit("turn off video room", data.userTurnOff);
    });
  });
  socket.on("turn on audio room", (data) => {
    console.log("turn on audio room", data);
    users[data.roomId].forEach((user) => {
      io.to(user.socketId).emit("turn on audio room", data.userTurnOn);
    });
  });
  socket.on("turn off audio room", (data) => {
    console.log("turn  audio room", data);
    users[data.roomId].forEach((user) => {
      io.to(user.socketId).emit("turn off audio room", data.userTurnOff);
    });
  });
  socket.on("expel member", (data) => {
    console.log("expel member", data);
    users[data.roomId]
      .filter((user) => user.socketId !== data.socketId)
      .forEach((socketId) => {
        io.to(socketId.socketId).emit("out room other", data);
      });
    io.to(data.socketId).emit("out room", data);
    users[data.roomId] = users[data.roomId].filter(
      (user) => user.socketId !== data.socketId
    );
  });
  socket.on("flip camera", (data) => {
    console.log("flip", data);
    users[data.roomId]
      .filter((user) => user.socketId !== data.socketId)
      .forEach((socketId) => {
        io.to(socketId.socketId).emit("replace peers", data);
      });
    users[data.roomId] = users[data.roomId].filter(
      (user) => user.socketId !== data.socketId
    );
  });
  // socket for groups
  socket.on("join group public", (data) => {
    io.to(data.socketId).emit("join group public", data);
  });
  socket.on("join group private", (data) => {
    console.log("joingroup private", data);
    io.to(data.socketId).emit("join group private", data);
  });
  socket.on("cancel request", (data) => {
    io.to(data.socketId).emit("cancel request", data);
  });
  socket.on("answer request", (data) => {
    io.to(data.socketId).emit(`answer request`, data);
  });
  socket.on("invite like page", (data) => {
    data.socketIds.forEach((socketId) => {
      io.to(socketId.socketId).emit("invite like page", {
        userId: socketId.userId,
        page: data.page,
        userInvite: data.userInvite,
      });
    });
  });
  socket.on("invite join group", (data) => {
    data.socketIds.forEach((socketId) => {
      io.to(socketId.socketId).emit("invite join group", {
        userId: socketId.userId,
        page: data.page,
        userInvite: data.userInvite,
      });
    });
  });
  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log(process.env.PORT);
  console.log(`Server is running on port 3000`);
});
