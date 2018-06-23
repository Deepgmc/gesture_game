var express = require('express'),
   expr_srv = express(),
   socket = require('socket.io');


var Game = (function(){
   /*
    * This object-array shows the relations between gestures
    * */
   var port = 3002,
      users = []
      relations = {
      paper: {
         rock: 'Paper covers Rock!',
         spock: 'Paper disproves Spock!'
      },
      scissors: {
         paper: 'Scissors cuts Paper',
         lizard: 'Scissors decapitate Lizard'
      },
      lizard: {
         spock: 'Lizard poisons Spock',
         paper: 'Lizard eats Paper'
      },
      spock: {
         scissors: 'Spock smashes Scissors',
         rock: 'Spock vaporizes Rock'
      },
      rock: {
         scissors: 'Rock crushes Scissors',
         lizard: 'Rock crushes Lizard'
      }
   };

   expr_srv.use(express.static('public'));

   var server = expr_srv.listen(port, function(){
      console.log('Server started on port ' + port);
   })

   var io = socket(server);

   io.on('connection', function(socket){
      // lets check is this lead or slave user.
      // lead user creates array value, slave user just adjusting to it.
      // after the second user connected we emitting message and reacting for it at client side

      socket.on('user_connect', function(data){
         if(data.isLeadUser){
            //add NEW user-leader
            users.push({
               leadSocketId: socket.id,
               slaveUid: data.slaveUid,
               slaveSocketId: null,

               leadSelection: '',
               slaveSelection: '',

               isConnected: false
            });
         } else {
            //adjust slave user to already created lead user
            users.forEach(function(item, index){
               if(item.slaveUid === data.slaveUid){
                  users[index].isConnected = true;
                  users[index].slaveSocketId = socket.id;
                  //emit on socket with leadSocketId that slave been connected
                  io.sockets.sockets[users[index].leadSocketId].emit('slave_user_connected', true);
                  return;
               }
            });
         }
      });

      socket.on('user_click_gesture', function(data){
         // handling the users clicks on the images
         var isLeadUser = data.isLeadUser,
            selection = data.selection,
            gameResult = {};
         users.forEach(function(user, i){
            if(
               isLeadUser && user.leadSocketId === socket.id ||
               !isLeadUser && user.slaveSocketId === socket.id
            ){
               isLeadUser ? user.leadSelection = selection : user.slaveSelection = selection;

               // first of all - ensure that both players clicked the gestures icons
               // then calculating the winner and sending the results
               // and reset the results
               if (user.leadSelection && user.slaveSelection){
                  if(user.leadSelection === user.slaveSelection){
                     // this is draw
                     gameResult = {winner: 'draw'};
                  } else {
                     // here we detecting who wins this round
                     if(relations[user.leadSelection][user.slaveSelection]){
                        // leadUser wins
                        gameResult = {
                           winner: 'lead',
                           text: relations[user.leadSelection][user.slaveSelection]
                        };
                     } else {
                        // slaveUser wins
                        gameResult = {
                           winner: 'slave',
                           text: relations[user.slaveSelection][user.leadSelection]
                        };
                     }
                  }

                  gameResult.leadSelection = user.leadSelection;
                  gameResult.slaveSelection = user.slaveSelection;

                  // Emitting the game results
                  io.sockets.sockets[user.leadSocketId].emit('round_results', gameResult);
                  io.sockets.sockets[user.slaveSocketId].emit('round_results', gameResult);
                  // resetting results
                  users[i].leadSelection = users[i].slaveSelection = '';
               }

               return true; // break
            };
         });
      });

      socket.on('disconnect', function(socket){
         // deleting user if it is lead user or setting !isConnected if slave
         users = users.map(function(item, index){
            if(socket.id === users[index].slaveUid){
               // map() "deleting" this user here
               return false;
            } else if (socket.id === users[index].slaveSocketId) {
               users[index].isConnected = false;
            }
            return users[index];
         });
      });
   });


})();
