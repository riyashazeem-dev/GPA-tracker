import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

/**
 * Thin Chart.js wrapper. Parents pass a ChartConfiguration; the chart is
 * created once and updated on changes, and destroyed with the view.
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  template: '<div class="relative w-full" [style.height.px]="height"><canvas #canvas></canvas></div>',
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() config!: ChartConfiguration;
  @Input() height = 280;

  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(): void {
    if (this.chart) {
      this.render();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private render(): void {
    if (!this.config || !this.canvas) {
      return;
    }
    this.chart?.destroy();
    this.chart = new Chart(this.canvas.nativeElement, this.config);
  }
}