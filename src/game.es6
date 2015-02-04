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

    this.inputHandler = new PlayingInputHandler(game);
    this.inputHandler.onKeyUp.add((key) => this.keys.push(key));
    this.playingField = this.createPlayingField(this.game);
    this.selectedHero = this.newHero(game);
    this.ball = new Ball(game, 10, 10);
    game.add.existing(this.selectedHero);
    game.add.existing(this.ball);
    this.cursors = game.input.keyboard.createCursorKeys()
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
    var bounds = this.playingField.bounds[0];
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

  pickupBall(hero) {
    hero.addChild(this.ball);
  }

  isBallHeld() {
    return this.ball.parent !== this.game.world;
  }

  handleBall() {
    if(this.isBallHeld()) return;

    let h = this.selectedHero;
    if(this.playerTouchesBall(h)) {
      console.log('player touched ball');
      this.pickupBall(h);
    }
  }

  update() {
    var h = this.selectedHero;
    this.applyDrag(h);
    this.checkInput();
    this.capVelocity(h);

    if(this.isOutOfBounds(h)) {
      console.log('out of bounds');
      let bounds = this.playingField.bounds[0];
      h.x = bounds.x + bounds.width - 2 * h.width;
    }

    this.handleBall();
  }

  render() {
    this.game.debug.body(this.selectedHero);
    this.game.debug.spriteInfo(this.selectedHero, 32, 32);

    //this.game.debug.body(this.ball);
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

  onKeyUpHero(key) {
    if(!this.selectedHero) return;

    let K = Phaser.Keyboard;
    let pt = (x, y) => new Phaser.Point(x, y);
    let dirs = [K.UP, K.DOWN, K.LEFT, K.RIGHT];
    let vm = 20
    let velocities = [pt(0, -vm), pt(0, vm), pt(-vm, 0), pt(vm, 0)];
    let mapping = _.zipObject(_.zip(dirs, velocities));

    let velocity = mapping[key.keyCode];
    console.log(key);
    console.log(mapping);
    let originalVelocity = this.selectedHero.body.velocity;
    this.selectedHero.body.velocity.setTo(
      originalVelocity.x + velocity.x,
      originalVelocity.y + velocity.y);
  }

  newHero(game) {
    if(! this.heroCounter) this.heroCounter = 1;
    let h = new Hero(game, 100, 100);
    h.name = `hero_${this.heroCounter}`;
    //h.anchor.set(0.5, 0.5);
    this.heros.add(h);
    this.heroCounter ++;
    return h;
  }

  setupPhysics(game) {
    game.physics.startSystem(Phaser.Physics.ARCADE);
    var heros = this.heros = game.add.group();
    heros.enableBody = true;
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

class PlayingInputHandler {
  constructor(game) {
    var addKey = (key) => game.input.keyboard.addKey(key);

    var K = Phaser.Keyboard;

    var onKeyUp = this.onKeyUp = new Phaser.Signal();

    [K.LEFT, K.RIGHT, K.UP, K.DOWN].forEach((k) =>
      addKey(k).onUp.add((code) => {
        console.log(code);
        onKeyUp.dispatch(code);
      })
    );
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
    this.bounds = [{
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
    this.bounds.forEach(({x: x, y: y, width: w, height: h}) =>
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
    this.circleSize = 20;
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
    g.beginFill(0x0000ff, 1);
    g.drawCircle(
      circleSize / 2,
      circleSize / 2,
      circleSize);
    this.addChild(g);
    return g;
  }
}

class Hero extends Phaser.Sprite {
  constructor(...args) {
    super(...args);
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
  }

  createNewGraphics(size) {
    let g = this.game.add.graphics();
    g.beginFill(0xFF0000, 1);
    g.drawRect(0, 0, size.width, size.height);
    this.addChild(g);
    return g;
  }
}
