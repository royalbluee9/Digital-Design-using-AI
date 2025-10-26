import { Component, ChangeDetectionStrategy, signal, inject, computed, WritableSignal, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HdlGeneratorService, GeneratedOutput, Deliverable } from './services/hdl-generator.service';
import { CodeDisplayComponent } from './components/code-display.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CodeDisplayComponent],
})
export class AppComponent {
  private hdlGeneratorService = inject(HdlGeneratorService);

  // Form State Signals
  description: WritableSignal<string> = signal('Design a 4-bit synchronous up-counter with an active-high reset.');
  hdlLanguage: WritableSignal<'VHDL' | 'Verilog'> = signal('Verilog');
  
  availableDeliverables: Deliverable[] = [
    { id: 'rtlCode', name: 'RTL Code', checked: true },
    { id: 'testbench', name: 'UVM Testbench', checked: true },
    { id: 'testCases', name: 'Test Cases', checked: false },
    { id: 'designSpec', name: 'Design Specification', checked: false },
  ];
  deliverables = signal<Deliverable[]>(this.availableDeliverables);

  // Application State Signals
  isLoading = signal(false);
  error = signal<string | null>(null);
  generatedOutput = signal<GeneratedOutput | null>(null);
  activeTab = signal<string | null>(null);
  loadingMessage = signal('Initializing AI assistant...');

  private loadingInterval: any;

  selectedDeliverables: Signal<string[]> = computed(() => 
    this.deliverables().filter(d => d.checked).map(d => d.id)
  );

  outputFiles = computed(() => {
    const output = this.generatedOutput();
    if (!output) return [];
    // FIX: The original code caused a type error because `value` was not narrowed after filtering,
    // leading to an invalid spread (`...value`) on a potentially undefined type.
    // `flatMap` correctly filters for existing values and maps them in a type-safe way.
    return Object.entries(output).flatMap(([key, value]) =>
      value ? [{ key, ...value }] : []
    );
  });

  async generate(): Promise<void> {
    if (this.isLoading() || !this.description().trim()) {
      return;
    }
    this.startLoading();
    this.error.set(null);
    this.generatedOutput.set(null);

    try {
      const result = await this.hdlGeneratorService.generateHdl(
        this.description(),
        this.hdlLanguage(),
        this.selectedDeliverables()
      );
      this.generatedOutput.set(result);
      // Set active tab to the first generated file
      const firstKey = Object.keys(result)[0];
      if (firstKey) {
        this.activeTab.set(firstKey);
      }
    } catch (err) {
      console.error('Error generating HDL:', err);
      const errorMessage = (err instanceof Error) ? err.message : 'An unknown error occurred. Please check the console for details.';
      this.error.set(`Failed to generate HDL content. ${errorMessage}`);
    } finally {
      this.stopLoading();
    }
  }

  toggleDeliverable(index: number): void {
    this.deliverables.update(current => {
      const updated = [...current];
      updated[index] = { ...updated[index], checked: !updated[index].checked };
      return updated;
    });
  }

  setActiveTab(key: string): void {
    this.activeTab.set(key);
  }

  private startLoading(): void {
    this.isLoading.set(true);
    const messages = [
      'Synthesizing RTL...',
      'Building UVM environment...',
      'Generating test cases...',
      'Running simulations...',
      'Analyzing coverage...',
      'Finalizing documentation...'
    ];
    let i = 0;
    this.loadingMessage.set(messages[i]);
    this.loadingInterval = setInterval(() => {
      i = (i + 1) % messages.length;
      this.loadingMessage.set(messages[i]);
    }, 2500);
  }

  private stopLoading(): void {
    this.isLoading.set(false);
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
  }
}
