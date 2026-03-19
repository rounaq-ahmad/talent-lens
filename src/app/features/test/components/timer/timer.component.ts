import {
  Component,
  input,
  output,
  signal,
  OnInit,
  OnDestroy,
} from '@angular/core';

@Component({
  selector: 'app-timer',
  standalone: true,
  templateUrl: './timer.component.html',
  styleUrl: './timer.component.scss',
})
export class TimerComponent implements OnInit, OnDestroy {
  durationMinutes = input.required<number>();
  /** When provided, the timer starts from this value instead of durationMinutes * 60. */
  initialSeconds = input<number | null>(null);

  timeUp = output<void>();

  remaining = signal(0);
  private interval: ReturnType<typeof setInterval> | null = null;

  get minutes(): number {
    return Math.floor(this.remaining() / 60);
  }

  get seconds(): number {
    return this.remaining() % 60;
  }

  get isWarning(): boolean {
    return this.remaining() <= 300 && this.remaining() > 60; // last 5 min
  }

  get isDanger(): boolean {
    return this.remaining() <= 60; // last 1 min
  }

  get formattedTime(): string {
    const m = String(this.minutes).padStart(2, '0');
    const s = String(this.seconds).padStart(2, '0');
    return `${m}:${s}`;
  }

  ngOnInit(): void {
    const override = this.initialSeconds();
    this.remaining.set(override !== null ? override : this.durationMinutes() * 60);
    this.interval = setInterval(() => {
      const current = this.remaining();
      if (current <= 0) {
        this.clearTimer();
        this.timeUp.emit();
        return;
      }
      this.remaining.set(current - 1);
    }, 1000);
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
