import * as gameConfig from "../gameConfig.json";

export class Preloader extends Phaser.Scene {
  constructor() { super("Preloader"); }

  preload(): void {
    this.setupLoadingProgressUI(this);
    this.load.pack('assetPack', 'assets/asset-pack.json');

    // 새 에셋 로드
    this.load.image('bg_new', 'assets/fishing_pack/bg_large.png');
    this.load.image('fish_sprite', 'assets/fishing_pack/fish.png');
    this.load.image('fisherman_sprite', 'assets/fishing_pack/fisherman.png');

    // 스프라이트 시트 (캐릭터)
    this.load.spritesheet('char_idle', 'assets/fishing_pack/char_idle_sheet.png', {
      frameWidth: 60, frameHeight: 60
    });
    this.load.spritesheet('char_reel', 'assets/fishing_pack/char_reel_sheet.png', {
      frameWidth: 105, frameHeight: 100
    });

    // 스프라이트 시트 (낚시 동작)
    this.load.spritesheet('cast_sheet', 'assets/fishing_pack/cast_sheet.png', {
      frameWidth: 105, frameHeight: 100
    });
    this.load.spritesheet('catch_sheet', 'assets/fishing_pack/catch_sheet.png', {
      frameWidth: 100, frameHeight: 100
    });
    this.load.spritesheet('idle_water', 'assets/fishing_pack/idle_sheet.png', {
      frameWidth: 120, frameHeight: 100
    });

    // 물고기
    this.load.spritesheet('golden_fish', 'assets/fishing_pack/golden_fish_sheet.png', {
      frameWidth: 34, frameHeight: 33
    });
  }

  create(): void {
    // 애니메이션 등록
    this.anims.create({
      key: 'anim_char_idle',
      frames: this.anims.generateFrameNumbers('char_idle', { start: 0, end: 3 }),
      frameRate: 6, repeat: -1
    });
    this.anims.create({
      key: 'anim_char_reel',
      frames: this.anims.generateFrameNumbers('char_reel', { start: 0, end: 3 }),
      frameRate: 8, repeat: -1
    });
    this.anims.create({
      key: 'anim_cast',
      frames: this.anims.generateFrameNumbers('cast_sheet', { start: 0, end: 3 }),
      frameRate: 8, repeat: 0
    });
    this.anims.create({
      key: 'anim_catch',
      frames: this.anims.generateFrameNumbers('catch_sheet', { start: 0, end: 2 }),
      frameRate: 10, repeat: 0
    });
    this.anims.create({
      key: 'anim_idle_water',
      frames: this.anims.generateFrameNumbers('idle_water', { start: 0, end: 1 }),
      frameRate: 3, repeat: -1
    });
    this.anims.create({
      key: 'anim_golden_fish',
      frames: this.anims.generateFrameNumbers('golden_fish', { start: 0, end: 4 }),
      frameRate: 8, repeat: -1
    });

    this.scene.start("TitleScreen");
  }

  private setupLoadingProgressUI(scene: Phaser.Scene): void {
    const cam = scene.cameras.main;
    const width = cam.width; const height = cam.height;
    const barWidth = Math.floor(width * 0.6);
    const barHeight = 20;
    const x = Math.floor((width - barWidth) / 2);
    const y = Math.floor(height * 0.5);

    const progressBox = scene.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(x - 4, y - 4, barWidth + 8, barHeight + 8);
    const progressBar = scene.add.graphics();
    const loadingText = scene.add.text(width / 2, y - 20, '로딩 중...', {
      fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0.5);

    const onProgress = (value: number) => {
      progressBar.clear(); progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(x, y, barWidth * value, barHeight);
    };
    const onComplete = () => {
      progressBar.destroy(); progressBox.destroy(); loadingText.destroy();
      scene.load.off('progress', onProgress);
    };
    scene.load.on('progress', onProgress);
    scene.load.once('complete', onComplete);
  }
}
