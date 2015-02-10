class App {
  constructor() {
    this.game = new Phaser.Game(800, 600, Phaser.CANVAS, 'game');
    this.game.state.add('playing', new PlayingState(this.game));
  }

  run() {
    console.log('run');
    this.game.state.start('playing');
  }
}

class PlayingState {
  create(game) {
    this.game = game;
    console.log('create');

    this.setupPhysics(game);

    this.keys = [];

    this.playingField = this.createPlayingField(this.game);
    this.teams = this.playingField.bounds.map(
      (bounds) => new Team(game, bounds));
    this.selectedHero = this.teams[0].getTeamMembers()[0];
    this.ball = new Ball(game, 10, 10);
    game.add.existing(this.ball);
    this.cursors = game.input.keyboard.createCursorKeys()
    this.throwKey = game.input.keyboard.addKey(Phaser.Keyboard.X);

    // the last player to touch the ball
    this.lastPlayerToTouchBall = null;
  }

  getPlayers() {
    return this.teams.map((m) => m.getTeamMembers()).
      reduce((mem, a) => mem.concat(a));
  }

  keyVelocityMapping() {
    let c = this.cursors;
    let keys = [c.up, c.down, c.left, c.right];
    let pt = (x, y) => new Phaser.Point(x, y);
    let vm = 20
    let velocities = [pt(0, -vm), pt(0, vm), pt(-vm, 0), pt(vm, 0)];
    return _.zip(keys, velocities);
  }

  isOutOfBounds(hero) {
    var bounds = this.playingField.bounds[0].bounds;
    let {x: x, y: y, width: width, height: height} = hero;
    // for some reason this doesn't work
    //return !Phaser.Rectangle.intersects(hero.body, bounds);

    return x + width > bounds.x + bounds.width;
  }

  playerTouchesBall(hero) {
    return Phaser.Rectangle.intersects(hero, this.ball.body);
  }

  checkInput() {
    this.keyVelocityMapping().forEach(([key, deltaVelocity]) => {
      if(! key.isDown) return;

      let originalVelocity = this.selectedHero.body.velocity;
      originalVelocity.setTo(
        originalVelocity.x + deltaVelocity.x,
        originalVelocity.y + deltaVelocity.y);
    });
  }

  isBallHeld() {
    return this.ball.parent !== this.game.world;
  }

  handleBall() {
    if(this.isBallHeld()) {
      if(this.throwKey.isDown) {
        this.selectedHero.throwBall();
      }
      return;
    }

    if(this.ball.isThrown) {
      let vel = this.ball.thrownVelocity;
      this.ball.body.velocity.setTo(vel.x, vel.y);
      return;
    }

    // ball not held

    let h = this.selectedHero;
    if(this.playerTouchesBall(h)) {
      console.log('player touched ball');
      this.havePlayerPickupBall(h);
    }
  }

  update() {
    var h = this.selectedHero;
    this.applyDrag(h);
    this.checkInput();
    this.capVelocity(h);

    if(this.isOutOfBounds(h)) {
      console.log('out of bounds');
      let bounds = this.playingField.bounds[0].bounds;
      h.x = bounds.x + bounds.width - 2 * h.width;
    }

    this.handleBall();

    this.checkCollisions();
  }

  checkCollisions() {
    let players = this.getPlayers();

    let collideCallback = (player, ball) =>
      console.log({
        what: 'collision',
        player: player,
        ball: ball
      });

    let processCallback = (player, ball) => {
      if(this.isBallHeld(ball)) {
        console.log('ball cannot collide while being held');
        return false;
      }

      console.log(player);
      console.log(this.lastPlayerToTouchBall);
      if(player === this.lastPlayerToTouchBall) {
        console.log('ball cannot collide with last player to touch ball');
        return false;
      }

      this.havePlayerPickupBall(player);
      return false;
    };

    players.forEach( (p) =>
      this.game.physics.arcade.collide(
        p,
        this.ball,
        collideCallback,
        processCallback));
  }

  havePlayerPickupBall(player) {
    player.pickupBall(this.ball);
    this.lastPlayerToTouchBall = player;
  }

  render() {
    this.game.debug.body(this.selectedHero);
    this.game.debug.spriteInfo(this.selectedHero, 32, 32);

    this.game.debug.body(this.ball);
    this.game.debug.spriteInfo(this.ball, 32, 150);
  }

  applyDrag(sprite) {
    let drag = 10;
    let originalVelocity = sprite.body.velocity;
    originalVelocity.setTo(
      this.towards0(originalVelocity.x, drag),
      this.towards0(originalVelocity.y, drag));
  }

  // cap is a magnitude (signless)
  capMagnitude(value, cap) {
    if(value > 0) return Math.min(value, cap);
    else return Math.max(value, -cap);
  }

  capVelocity(sprite) {
    let maxMagnitude = 300;
    let v = sprite.body.velocity;
    v.setTo(
      this.capMagnitude(v.x, maxMagnitude),
      this.capMagnitude(v.y, maxMagnitude));
  }

  towards0(value, magnitude) {
    if(value > 0) {
      value -= magnitude;
    } else if(value < 0) {
      value += magnitude;
    }
    return value;
  }

  setupPhysics(game) {
    game.physics.startSystem(Phaser.Physics.ARCADE);
  }

  createPlayingField(game) {
    let playingFieldDimensions = {
      width: game.world.width,
      height: game.world.height
    };
    let pf = new PlayingField(playingFieldDimensions, game, 0, 0);
    game.add.existing(pf);
    return pf;
  }
}

class Team {
  constructor(game, fieldBounds) {
    this.group = game.add.group();
    this.fieldBounds = fieldBounds;
    this.heroCounter = 0;

    let bounds = fieldBounds.bounds;
    this.spawnPoint = new Phaser.Point(
      bounds.x + 100, bounds.y + 100);

    this.newTeamMember(game);
  }

  getTeamMembers() {
    return this.group.children;
  }

  newTeamMember(game) {
    if(! this.heroCounter) this.heroCounter = 1;
    let h = new Hero(this, game, this.spawnPoint.x, this.spawnPoint.y);
    h.name = `hero_${this.heroCounter}`;
    //h.anchor.set(0.5, 0.5);
    this.heroCounter ++;
    this.group.add(h);
    return h;
  }

}

class PlayingFieldBounds {
  constructor(bounds, otherFieldBounds) {
    this.bounds = bounds;
    this.otherFieldBounds = otherFieldBounds;
  }

  setOtherFieldBounds(value) {
    this.otherFieldBounds = value;
    // will be positive or negative
    let x = this.otherFieldBounds.bounds.x - this.bounds.x;
    this.ballDirection = new Phaser.Point(
      x / Math.abs(x),
      0);
    console.log(this.ballDirection);
  }
}

class PlayingField extends Phaser.Sprite {
  constructor(dimensions, ...args) {
    super(...args);
    this.dimensions = dimensions;
    this.createNewGraphics();
  }

  createNewGraphics() {
    let game = this.game;
    let g = this.game.add.graphics();
    let lineColor = 0xccccff;
    let fieldColor = 0x00ff00;
    let lineWidth = 10;
    let linePadding = lineWidth / 2;
    let middleX = this.dimensions.width / 2;

    g.lineStyle(lineWidth, lineColor, 1);
    g.beginFill(fieldColor, 1);
    // left
    var simpleBounds = [{
      x: linePadding,
      y: linePadding,
      width: middleX,
      height: this.dimensions.height - lineWidth
    }, {
      x: middleX - linePadding,
      y: linePadding,
      width: middleX,
      height: this.dimensions.height - lineWidth
    }];
    this.bounds = simpleBounds.map((b) => new PlayingFieldBounds(b));
    this.bounds[0].setOtherFieldBounds(this.bounds[1]);
    this.bounds[1].setOtherFieldBounds(this.bounds[0]);

    simpleBounds.forEach(({x: x, y: y, width: w, height: h}) =>
                        g.drawRect(x, y, w, h));
    //g.drawRect(linePadding, linePadding, middleX, this.dimensions.height - lineWidth);
    //// right
    //g.drawRect(middleX - linePadding, linePadding, middleX, this.dimensions.height - lineWidth);

    return g;
  }
}

class Ball extends Phaser.Sprite {
  constructor(...args) {
    super(...args);
    this.circleSize = 40;
    this.graphics = this.createNewGraphics(this.circleSize);
    //this.anchor.setTo(0.5, 0.5);
    this.game.physics.enable(this, Phaser.Physics.ARCADE);
    this.body.collideWorldBounds = true;
    this.body.allowRotation = false;
    this.body.width = this.circleSize;
    this.body.height = this.circleSize;
  }
  createNewGraphics(circleSize) {
    let g = this.game.add.graphics();
    g.beginFill(0xffffff, 1);
    g.drawCircle(
      circleSize / 2,
      circleSize / 2,
      circleSize);
    this.addChild(g);
    return g;
  }

  throw(x, y, velocity) {
    if(this.parent === this.game.world) {
      console.log('cannot throw because no one is holding ball');
      return;
    }
    console.log({
      what: 'throw',
      velocity: velocity
    });
    // put it back in the playing field
    this.game.add.existing(this);
    this.x = x;
    this.y = y;
    this.isThrown = true;
    this.thrownVelocity = velocity;
  }
}

class Hero extends Phaser.Sprite {
  constructor(team, ...args) {
    super(...args);
    this.team = team;
    this.heroSize = {
      width: 50,
      height: 80
    };
    console.log(this.game);
    this.graphics = this.createNewGraphics(this.heroSize);
    this.game.physics.enable(this, Phaser.Physics.ARCADE);
    this.body.collideWorldBounds = true;
    this.body.allowRotation = false;
    this.body.width = this.heroSize.width;
    this.body.height = this.heroSize.height;
    this.hasBall = false;
    this.ball = null;
  }

  pickupBall(ball) {
    this.hasBall = true;
    this.ball = ball;
    this.addChild(ball);

    this.ball.x = 0;
    this.ball.y = 0;
    this.ball.body.velocity.setTo(0, 0);
  }

  getBallDirection() {
    return this.team.fieldBounds.ballDirection;
  }

  throwBall() {
    if(!this.ball) {
      console.log('player doesnt have ball');
      return;
    }
    console.log('player throws ball');

    let ball = this.ball;
    this.ball = null;

    let sign = this.getBallDirection().x;
    let vx = sign > 0 ? Math.max(this.body.velocity.x, 0):
                        Math.min(this.body.velocity.x, 0);
    let ballSpeed = 100;
    let magnitude = vx + ballSpeed;

    // ball should move towards the direction of play
    ball.throw(this.x + 2 * this.width * this.getBallDirection().x, this.y,
               new Phaser.Point().copyFrom(this.getBallDirection()).
                 setMagnitude(vx + 50));

    this.hasBall = false;
  }

  createNewGraphics(size) {
    let g = this.game.add.graphics();
    g.beginFill(0xFF0000, 1);
    g.drawRect(0, 0, size.width, size.height);
    this.addChild(g);
    return g;
  }
}
