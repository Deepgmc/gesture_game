// webpack imports
import React from 'react';
import ReactDOM from 'react-dom';

var Gesture_App = (function(){
   // Gesture_App local variables
   var module = {}, // for non-private return
      io = require('socket.io-client'),
      socket = io.connect('http://localhost:3002'),
      // presence of a GET-parameter says the user type
      slaveId_get = new URL(window.location.href).searchParams.get('uid') || null,
      isLeadUser = !slaveId_get;

   function makeId(len) {
      var ret = '',
          letters = 'abcdefghijklmnopqrstuvwxyz';
      for( var i = 0; i < len; i++ )
         ret += letters.charAt(Math.floor(Math.random() * letters.length));
      return ret;
   }

   // if we're the lead player - we generate the unique id
   // to the slave player for further connection
   if(isLeadUser){
      module.generatedSlaveId = makeId(7);
   }


   function LeadUserHeader(props) {
      return (
         <div>
            <p>Connection link:</p>
            <span className="connection_link">http://localhost:3002/?uid={module.generatedSlaveId}</span>
         </div>
      );
   }
   function SecondUserHeader(props) {
      return <p></p>; // empty header for slave user; may be some greetings
   }
   function AppHeader(props) {
      if (props.isLeadUser) {
         return <LeadUserHeader />;
      }
      return <SecondUserHeader />;
   }

   // rendering header depends on user degree (lead or slave)
   // pass it through a prop
   ReactDOM.render(
      <AppHeader isLeadUser={ isLeadUser } />,
      document.getElementById('appTitle_cnt')
   );


   /*
   * The primary game classes|components
   * GameComponent
   *  - main ocmponent, contains the state of a gestures
   *  - consists of next child components:
   *     - gesture buttons (GesturesComponent, ItemComponent)
   *     - result area (with a submit button)
   * */

   class GameComponent extends React.Component {
      // saving the global selection state
      // later, it can save for example the total game score and so on
      constructor(props) {
         super(props);

         this.state = {
            // shows the game screen insted of loading screen when slave user joining
            slaveUserJoined: false
         };
      }

      componentDidMount(){
         var self = this;
         socket.emit('user_connect', {
            isLeadUser: isLeadUser,
            slaveUid: slaveId_get || module.generatedSlaveId
         });
         socket.on('slave_user_connected', function(data){
            // slave user joined to us, lets switch state
            self.setState( {slaveUserJoined: true} );
         });
      }

      render() {
         if( !isLeadUser || this.state.slaveUserJoined ){
            return (
               <div>
                  <h4>CHOOSE ONE OF THE GESTURES BELOW:</h4>
                  <GesturesComponent />
                  <ResultsComponent />
               </div>
            );
         } else {
            return (
               <div>
                  <div className="loading_screen">
                     <p>Send the link above to your friend so we can start a game!</p>
                     <img src="img/loading.gif" />
                  </div>
               </div>
            );
         }
      }
   }

   class GesturesComponent extends React.Component {
      // component with an gesture-icons
      constructor(props) {
         super(props);
         this.state = {
            gestures: ['lizard', 'paper', 'rock', 'scissors', 'spock']
         };
      }

      render() {
         var self = this,
             gestures = this.state.gestures;
         gestures = gestures.map(function(item, index){
            return (
               <ItemComponent
                  key = {index}
                  item = {item}
                  handleClick = {self.handleClick.bind(self)}
                  currentSelection = {self.state.currentSelection}
               />
            )
         });

         return (
            <div>
               {gestures}
            </div>
         );
      }

      handleClick(item){
         this.setState({currentSelection: item}, function(){
            // item click state-change callback
            // emitting click data only after a state changed
            socket.emit('user_click_gesture', {
               selection: item,
               isLeadUser: isLeadUser // from the closure (global module)
            });
         });
      }
   }

   // single-gesture component
   class ItemComponent extends React.Component {
      render() {
         var src = 'img/' + this.props.item + '.png',
             finalClassName = 'gestureItem';

         // add a green border to the selected gesture icon
         if (this.props.item === this.props.currentSelection){
            finalClassName += ' selectedItem';
         }

         return (
            <img
               className = {finalClassName}
               src = {src}
               gesture_id = {this.props.item}
               onClick = {this.handleClick.bind(this)}
            />
         );
      }

      handleClick() {
         this.props.handleClick(this.props.item);
      }
   }

   class ResultsComponent extends React.Component {
      constructor(props) {
         super(props);

         this.initialState =
         this.state = {
            leadSelection: '',
            slaveSelection: '',
            winner: '',
            text: ''
         };
      }

      componentDidMount(){
         var self = this;
         socket.on('round_results', function(srv_round_response){
            self.setState(srv_round_response);
         });
      }

      render() {
         var firstImage = 'img/',
             secondImage = 'img/',
             winnerText = '',
             textColorClass = 'resultsText ';
         if(isLeadUser){
            winnerText = this.state.winner === 'lead' ? 'win' : 'loose';
            textColorClass += this.state.winner === 'lead' ? 'tc_green' : 'tc_red';
            firstImage += this.state.leadSelection;
            secondImage += this.state.slaveSelection;
         } else {
            winnerText = this.state.winner === 'slave' ? 'win' : 'loose';
            textColorClass += this.state.winner === 'slave' ? 'tc_green' : 'tc_red';
            firstImage += this.state.slaveSelection;
            secondImage += this.state.leadSelection;
         }
         firstImage += '.png';
         secondImage += '.png';
         if(this.state.winner){
            return(
               <div id="app_resultArea">
                  <h4>ROUND RESULTS:</h4>
                  <img className="resultsImage" src={firstImage}/>
                  <img className="resultsImage" src={secondImage}/>
                  <div className="resTextContainer">
                     <p className="resultsText">{this.state.text}!</p>
                     <p className={textColorClass}>You {winnerText}!</p>
                  </div>
                  <button className="resetButton" onClick={this.handleResetClick.bind(this)}>Start new round</button>
               </div>
            )
         } else {
            return false;
         }
      }

      handleResetClick() {
         this.setState(this.initialState);
      }
   }

   ReactDOM.render(
      <GameComponent />,
      document.getElementById('app_gameArea')
   );

   return module;

})();


