
import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-code-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './code-display.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeDisplayComponent {
  filename = input.required<string>();
  language = input.required<string>();
  code = input.required<string>();

  copyButtonText = signal('Copy');

  async copyCode() {
    if (!this.code()) return;
    try {
      await navigator.clipboard.writeText(this.code());
      this.copyButtonText.set('Copied!');
      setTimeout(() => this.copyButtonText.set('Copy'), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      this.copyButtonText.set('Error');
      setTimeout(() => this.copyButtonText.set('Copy'), 2000);
    }
  }
}
