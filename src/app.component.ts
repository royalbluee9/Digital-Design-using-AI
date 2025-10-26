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
  protocol: WritableSignal<string> = signal('None');
  simulationTool: WritableSignal<string> = signal('ModelSim');
  
  availableDeliverables: Deliverable[] = [
    { id: 'rtlCode', name: 'RTL Code', checked: true },
    { id: 'testbench', name: 'UVM Testbench', checked: true },
    { id: 'functionalCoverage', name: 'Func. Coverage', checked: false },
    { id: 'svaAssertions', name: 'SVA Assertions', checked: false },
    { id: 'simulationScripts', name: 'Sim Scripts', checked: false },
    { id: 'testCases', name: 'Test Cases', checked: false },
    { id: 'designSpec', name: 'Design Spec', checked: false },
    { id: 'performanceReport', name: 'Perf. Report', checked: false },
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

  simulationScriptsSelected: Signal<boolean> = computed(() => 
    this.selectedDeliverables().includes('simulationScripts')
  );

  outputFiles = computed(() => {
    const output = this.generatedOutput();
    if (!output) return [];
    // FIX: Added a check to ensure `value` is an object before spreading it.
    // The API response is not strictly typed after JSON.parse, so a deliverable
    // could be a non-object truthy value (e.g., a string or number), which
    // would cause a runtime error with the spread operator.
    return Object.entries(output).flatMap(([key, value]) =>
      (value && typeof value === 'object') ? [{ key, ...value }] : []
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
        this.selectedDeliverables(),
        this.protocol(),
        this.simulationTool()
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
      'Analyzing requirements...',
      'Synthesizing RTL...',
      'Building UVM environment...',
      'Generating assertions & coverage...',
      'Writing simulation scripts...',
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
