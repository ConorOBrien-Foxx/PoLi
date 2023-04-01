export class TweenManager {
    static RejectReason = {
        Kill: Symbol("TweenManager.RejectReason.Kill"),
        Error: Symbol("TweenManager.RejectReason.Error"),
    };
    
    constructor() {
        this.tweens = [];
    }
    
    addTween(source, target, duration/*, { update = null }*/) {
        let onKeys = Object.keys(target);
        // override existing tweens for key
        this.tweens = this.tweens.filter(tween =>
            source !== tween.source ||
            !onKeys.includes(tween.key)
        );
        let promises = onKeys.map(key => {
            let start = source[key];
            let end = target[key];
            let step = (end - start) / duration;
            // TODO: allow fixed step size
            return new Promise((resolve, reject) => {
                this.tweens.push({
                    source, key, start, end, step,
                    // update,
                    resolve, reject,
                });
            });
        });
        return Promise.all(promises);
    }
    
    removeAllTweensFor(source) {
        this.tweens = this.tweens.filter(tween => {
            if(tween.source === source) {
                tween.reject(TweenManager.RejectReason.Kill);
                return false;
            }
            else {
                return true;
            }
        });
    }
    
    removeTween(source, target) {
        let onKeys = Object.keys(target);
        this.tweens = this.tweens.filter(tween => {
            if(tween.source === source && onKeys.includes(tween.key)) {
                tween.reject(TweenManager.RejectReason.Kill);
                return false;
            }
            else {
                return true;
            }
        });
    }
    
    step(now, elapsed) {
        // console.log(elapsed);
        this.tweens = this.tweens.map(tween => {
            let { source, key, start, end, step, resolve } = tween;
            source[key] += step * elapsed;
            const isAtEnd = Math.sign(source[key] - end) == Math.sign(step);
            if(isAtEnd) {
                source[key] = end;
                resolve({ source, key, end });
                return null;
            }
            else {
                return tween;
            }
        }).filter(tween => tween);
    }
}

export const FrameTweener = new TweenManager();
export const LogicTweener = new TweenManager();
