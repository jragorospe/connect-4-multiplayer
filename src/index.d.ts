type GamePiece = 0 | 'yellow' | 'red';
type Board = GamePiece[][];

interface Room {
  id: string,
  sockets: Array<Socket>,
}

interface Rooms {
  [id: string]: Room,
}

interface Position {
  x: number,
  y: number,
}

interface Player {
  username: string,
  colour: 'yellow' | 'red',
  myTurn: boolean,
  socket: Socket,
}

interface Game {
  player1?: Player,
  player2?: Player,
  roomId: id,
  board: Board,
  started: boolean,
  gameover: boolean,
}

interface Games {
  [id: string]: Game,
}

interface JoinRequest {
  roomId: string,
  username: string
}
