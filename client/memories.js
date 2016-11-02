import React from 'react';
import {
  StyleSheet,
  AsyncStorage,
  View,
  ListView,
  ScrollView,
  AlertIOS,
  Text,
  TouchableHighlight,
  Image
} from 'react-native';
import { Font } from 'exponent';
import { Container, Header, Title, Content, Footer, InputGroup, Input, Button } from 'native-base';
import { Ionicons } from '@exponent/vector-icons';
import ScrollableTabView, { ScrollableTabBar, } from 'react-native-scrollable-tab-view';
// import ScrollableTabView, { DefaultTabBar, } from 'react-native-scrollable-tab-view';
import config from './config';

var STORAGE_KEY = 'id_token';
var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});


export default class Memories extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      image: {},
      imageList: [],
      queryList: [],
      fontLoaded: false,
      searchTerm: '',
      searchQuery: [],
      searching: false
    };
  }

  async componentDidMount() {
    await Font.loadAsync({
      'helvetica': require('./assets/fonts/HelveticaNeueMed.ttf'),
      'pacifico': require('./assets/fonts/Pacifico.ttf'),

    });
    this.setState({ fontLoaded: true });
    this.fetchMemories();
  }

  _navigate(image) {
    this.props.navigator.push({
      name: 'Memory',
      passProps: {
        'image': {uri: image.uri},
        'id': image.id,
        'username': this.props.username,
        'prevScene': 'Memories'
      }
    });
  }


  _navigateHome() {
    this.props.navigator.push({
      name: 'Homescreen',
      passProps: {
        'username': this.props.username
      }
    });
  }

  async fetchMemories() {
    
    var context = this;
    
    try {
      var token =  await AsyncStorage.getItem(STORAGE_KEY);
      console.log(token);
    } catch (error) {
      console.log('AsyncStorage error: ' + error.message);
    }

    fetch(config.domain + '/api/memories/all', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    })
    .then(function(memories) {
      var memoryArray = JSON.parse(memories['_bodyInit']);
      var images = memoryArray.map(memory => {
        return {
          id: memory._id,
          uri: memory.filePath
        };
      });
      context.setState({imageList: images});
      console.log(images);
      var allTags = memoryArray.map(memory => {
        return memory.tags;
      }).reduce((a, b) => {return a.concat(b)}, []);

      var tagsCount = {};
      allTags.forEach(a => { tagsCount[a] = (tagsCount[a] || 0) + 1; });

      var newres = [];
      for (var key in tagsCount) {
        newres.push({'name': key, 'count': tagsCount[key] + ''});
      }
      console.log(newres);
      context.setState({tagsCount: ds.cloneWithRows(newres)});
    });
  }

  async search() {
    var query = this.state.searchQuery;
    if (this.state.searchTerm === '') {
      return;
    }
    
    query.push(this.state.searchTerm);
    this.setState({searchQuery: query});

    var context = this;
    try {
      var token =  await AsyncStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.log('AsyncStorage error: ' + error.message);
    }
    fetch(config.domain + '/api/memories/search', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        searchParameter: this.state.searchQuery
      })
    }).then(function(memories) {
      var memoryArray = JSON.parse(memories['_bodyInit']);
      var images = memoryArray.map(memory => {
        return {
          id: memory._id,
          uri: memory.filePath
        };
      });
      context.setState({
        queryList: images,
        searching: true,
        searchTerm: ''});
    })
  }

  async removeAndPartialSearch(index) {
    
    this.state.searchQuery.splice(index,1);
    if (this.state.searchQuery.length === 0) {
      this.setState({searching: false});
    }
    this.setState({searchQuery: this.state.searchQuery});
    this.fetchMemories();
  }

  async cancelSearch() {
    this.setState({searching: false});
    this.setState({searchQuery: []});
    this.fetchMemories();
  }

  _renderRow(rowData) {
    return (<View style={{height:70,borderBottomColor: '#ededed', borderBottomWidth:1, paddingLeft:10, paddingTop:10}}>
              <Text style={{fontSize:22}}>{rowData.name}</Text>
              <Text style={{color: '#666'}}>{rowData.count}</Text>
            </View> )
  }

  render() {
    var context = this;
    var searchQueueNode = this.state.searchQuery.map(function(term, index) {
      return (
        <Button key={index} onPress={context.removeAndPartialSearch.bind(context,index)} style={styles.tag} rounded info>
          <Text key={index} style={styles.tagText}>
          {term}  <Ionicons name="ios-close" size={25} color="#444" />
          </Text>
        </Button>
      )           
    })

    return (
      <View>
        {
          this.state.fontLoaded ? (
            <Header>
              <Button transparent onPress={() => this.props.navigator.pop()}>
                <Ionicons name="ios-arrow-back" size={32} style={{color: '#25a2c3', marginTop: 5}}/>
              </Button>
              <Title style={styles.headerText}>{this.props.username}'s Memories</Title>
              <Button transparent onPress={this._navigateHome.bind(this)}>
                  <Ionicons name="ios-home" size={35} color="#444" />
              </Button>
            </Header>
          ) : null
        }
        
        <ScrollableTabView
          style={{marginTop: 0, }}
          initialPage={0}
          tabBarPosition='top'
          renderTabBar={() => <ScrollableTabBar activeTextColor="#25a2c3" underlineStyle={{ backgroundColor:"#25a2c3"}}/>} >

          <ScrollView tabLabel='Photos'>
            <Content contentContainerStyle={{
              flexWrap: 'wrap',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
            <View style={{flexDirection: 'row', margin: 10}}>
              <InputGroup borderType='rounded' style={{width: 250}}>
                  <Input 
                    placeholder='Search'
                    onChangeText={(text) => this.setState({searchTerm: text})}
                    value={this.state.searchTerm}
                  />
              </InputGroup>
              <Button rounded style={{backgroundColor: '#25a2c3', marginLeft: 5}} onPress={this.search.bind(this)}>
                <Ionicons name='ios-search' size={25} color="#fff"/>
              </Button>
              {
                this.state.searching ? (
                  <Button rounded bordered style={{borderColor: '#ccc', marginLeft: 5}} 
                          onPress={this.cancelSearch.bind(this)}>
                    <Text style={{color: '#444'}}>Cancel</Text>
                  </Button>
                ) : null
              }
            </View>
            <View style={{flexDirection:'column'}}>
              <View>
                <View style={styles.tagsContainer}>
                  {searchQueueNode}
                </View>
              </View>
              <View style={{flexDirection: 'row'}}>
                {
                  this.state.searching ? (
                    this.state.queryList.map((image, i) => 
                      <TouchableHighlight key={i} onPress={this._navigate.bind(this, image)}>
                        <Image key={i} style={styles.thumbnail} resizeMode={Image.resizeMode.contain} source={{uri: image.uri}}/>
                      </TouchableHighlight>
                    )
                  )
                  :
                  this.state.imageList.map((image, i)=> 
                    <TouchableHighlight key={i} onPress={this._navigate.bind(this, image)}>
                      <Image key={i} style={styles.thumbnail} resizeMode={Image.resizeMode.contain} source={{uri: image.uri}}/>
                    </TouchableHighlight>
                  )
                }
              </View>
            </View>
            </Content>
          </ScrollView>

          <ScrollView tabLabel='Tags'>
            <ListView dataSource={this.state.tagsCount} renderRow={this._renderRow}></ListView>
          </ScrollView>

        </ScrollableTabView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  headerText: {
    ...Font.style('pacifico'),
    fontSize: 30,
    color: '#444',
    paddingTop: 25
  },

  thumbnail: {
    width: 90,
    height: 90,
    margin: 1
  },

  tag: {
    margin: 10
  },

  tagText: {
    ...Font.style('pacifico'),
    fontSize: 16,
    letterSpacing: 1
  },

  tagsContainer: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  }

});

/*

<Header searchBar rounded>
           <InputGroup>
               <Ionicons name='ios-search' />
               <Input placeholder='Search' />
               <Ionicons name='ios-people' />
           </InputGroup>
           <Button transparent>
               Search
           </Button>
       </Header>


<Header>
          <Button transparent onPress={() => this.props.navigator.pop()}>
            <Ionicons name="ios-arrow-back" size={32} style={{color: '#25a2c3', marginTop: 5}}/>
          </Button>
          <Title style={styles.headerText}>{this.props.username}'s Memories</Title>
          <Button transparent onPress={this._navigateHome.bind(this)}>
            <Ionicons name="ios-home" size={35} color="#444" />
          </Button>
        </Header>
        */
