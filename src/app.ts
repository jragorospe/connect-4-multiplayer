import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import { createServer, Server } from 'http';
import socket, { Server as ioServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

const app: Application = express();
const server: Server = createServer(app)
const io: ioServer = socket(server)
const port: number = 3000;
let startingBoard: Board = [[0,0,0,0,0,0,0],
                            [0,0,0,0,0,0,0],
                            [0,0,0,0,0,0,0],
                            [0,0,0,0,0,0,0],
                            [0,0,0,0,0,0,0],
                            [0,0,0,0,0,0,0]];
let rooms: Rooms = {};
let games: Games = {};
/**
 * connect a socket to a specified room
 * @param socket A connected socket.io socket
 * @param room An object that represents a room from the `rooms` instance variable object
 */
const joinRoom = (socket: socket.Socket, room: Room) => {
  console.log(`Trying to join room: ${room.id}`)
  room.sockets.push(socket);
  socket.join(room.id, () => {
    // store the room id in the socket for future use
    socket.roomId = room.id;
    console.log('Successfully joined room')
  });
};

const createRoom = (socket: socket.Socket, roomId: string) => {
  const room: Room = {
    id: roomId,
    sockets: []
  }
  rooms[roomId] = room;
  joinRoom(socket, room)
}
/**
 * make the socket leave any rooms that it is a part of
 * @param socket A connected socket.io socket
 */
const leaveRooms = (socket: socket.Socket) => {
  const roomsToDelete = [];
  for (const id in rooms) {
    const room = rooms[id];
    // check to see if the socket is in the current room
    if (room.sockets.includes(socket)) {
      socket.leave(id);
      // remove the socket from the room object
      room.sockets = room.sockets.filter((item) => item !== socket);
    }
    // Prepare to delete any rooms that are now empty
    if (room.sockets.length == 0) {
      roomsToDelete.push(room);
    }
  }

  // Delete all the empty rooms that we found earlier
  for (const room of roomsToDelete) {
    delete rooms[room.id];
  }
};

const joinGame = (socket: socket.Socket, game: Game, playerName: string) => {
  if (game.player2 !== undefined) {
    socket.emit('game-full');
  } else {
    game.started = true;
    game.player2 = {
      colour: 'red',
      username: playerName,
      myTurn: false,
      socket: socket
    };
    console.log(`Player 2 is: ${playerName}`);
    games[game.roomId] = game;
  }

}

const createGame = (socket: socket.Socket, gameId: string, playerName: string) => {
  console.log(`Creating a game with gameId: ${gameId}`);
  const game: Game = {
    board: startingBoard,
    started: false,
    gameover: false,
    roomId: gameId,
    player1: {
      colour: 'yellow',
      username: playerName,
      myTurn: true,
      socket: socket
    }
  };
  console.log(`Player 1 is: ${playerName}`);
  games[gameId] = game;
}


// ROUTES //

app.use(bodyParser.urlencoded());
app.use(cors());
app.use(express.static("public"));
app.use(cookieParser());

app.get('/', (req: Request, res: Response) => {
  res.sendFile('/public/index.html', { root: '.' });
});

app.get('/room/:roomId', (req: Request, res: Response) => {
  res.sendFile("/public/game.html", { root: '.' });
});

app.post('/username', (req: Request, res: Response) => {
  console.log(`Setting username cookie to: ${req.body.username}`)
  res.cookie('username', req.body.username).send()
});

app.post('/theme', (req: Request, res: Response) => {
  console.log(`Setting theme cookie to: ${req.body.theme}`)
  res.cookie('theme', req.body.theme).send()
});

// SOCKETS //

io.on('connection', socket => {
  console.log('User connected')

  socket.on('join', (joinRequest: JoinRequest) => {
    console.log(joinRequest);
    let roomToJoin = rooms[joinRequest.roomId];
    if (roomToJoin === undefined) {
      createRoom(socket, joinRequest.roomId)
    } else {
      joinRoom(socket, roomToJoin);
    }
    socket.broadcast.to(joinRequest.roomId).emit('joined', joinRequest.username)
  });

  socket.on('place-tile', (pos: Position) => {
    console.log('Got a place-tile for ', pos);
    console.log(`Attempting to send a place tile to room: ${socket.roomId}`)
    socket.broadcast.to(socket.roomId).emit('place-tile', pos);
  });

  socket.on('ready', (user: string) => {
    if (socket.roomId in games) {
      let game = games[socket.roomId];
      joinGame(socket, game, user)
    } else {
      createGame(socket, socket.roomId, user)
    }
  });

  socket.on('win', () => {
    io.to(socket.roomId).emit('win');
  });

  socket.on('new-game', (game: Game) => {
    if (game.gameover === true) {
      let newGame: Game = {
        player1: game.player1,
        player2: game.player2,
        board: startingBoard,
        roomId: socket.roomId,
        gameover: false,
        started: false,
      }
      games[game.roomId] = newGame
      socket.to(socket.roomId).emit('new-game', game)
    } else {
      console.log('Received new game, but gameover is false')
    }
  });

  socket.on('leave', () => {
    leaveRooms(socket);
  });

  socket.on('disconnect', () => {
    console.log("A user disconnected");
    leaveRooms(socket);
  });
})

server.listen(port, () => {
  console.log(`Listening on at http://localhost:${port}`);
})
