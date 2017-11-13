export class Sound {

    private channels: HTMLAudioElement[] = [];
    private current = 0;
    private volume;

    constructor(sourceUrl: string, volume: number, numberOfChannels: number) {
        if (numberOfChannels < 1 || !Number.isInteger(numberOfChannels)) {
            throw new RangeError('Number of channels must be a positive integer.');
        }

        let audio = new Audio(sourceUrl);
        for (let i = 0;i < numberOfChannels; i++) {
            this.channels.push(<HTMLAudioElement>(audio.cloneNode()));
        }

        this.volume = volume;
    }

    get currentTime() {
        return this.channels[0].currentTime;
    }

    set currentTime(time: number) {
        this.channels[0].currentTime = time;
    }

    get duration() {
        return this.channels[0].duration;
    }

    play() {
        this.channels[this.current++].play();
        if (this.current >= this.channels.length)
            this.current = 0;
    }

    setVolume(vol: number) {
        for (let channel of this.channels)
            channel.volume = this.volume * vol;
    }

    getCurrentTime(): number {
        return this.channels[0].currentTime;
    }

    addEventListener(event: string, f: () => any) {
        this.channels[0].addEventListener(event, f);
    }
}