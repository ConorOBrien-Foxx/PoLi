export class ImageManager {
    constructor() {
        this.spritesheets = {};
    }

    spritesheet(name, path, { resolution, width, height }) {
        this.spritesheets[name] = {
            image: new Image(),
            sprites: {},
            width, height, resolution
        };
        this.spritesheets[name].image.src = `./res/img/${path}`;
    }

    // add(name, path) { }

    sprite(base, name, x, y) {
        this.spritesheets[base].sprites[name] = { x, y };
    }

    drawSprite(ctx, base, name, dx, dy, width, height, options) {
        options ??= {};
        options.centered ??= true;
        let spritesheet = this.spritesheets[base];
        let { x: spx, y: spy } = spritesheet.sprites[name];

        if(options.centered) {
            dx -= width / 2;
            dy -= height / 2;
        }

        ctx.drawImage(spritesheet.image,
            spx * spritesheet.resolution, spy * spritesheet.resolution,
            spritesheet.resolution, spritesheet.resolution,
            dx, dy, width, height
        );
    }
}
