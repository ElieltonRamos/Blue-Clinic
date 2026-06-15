import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { CdkPortal, PortalModule } from '@angular/cdk/portal';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChatService } from '../../services/chat.service';
import { NotificationService } from '../../../../shared/toastr/notification.service';
import { WhatsappTemplate, WhatsappTemplateComponent } from '../../types/chat.types';

@Component({
  selector: 'app-template-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, PortalModule],
  templateUrl: './template-modal.html',
})
export class TemplateModal implements AfterViewInit, OnDestroy, OnChanges {
  private readonly chatService = inject(ChatService);
  private readonly notification = inject(NotificationService);
  private readonly overlay = inject(Overlay);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  @Input() isOpen = false;
  @Input() conversationId: number | null = null;
  @Input() prefillTemplateName?: string;
  @Input() prefillParams: Record<string, string> = {};
  @Output() close = new EventEmitter<void>();
  @Output() sent = new EventEmitter<void>();

  @ViewChild(CdkPortal) portal!: CdkPortal;

  private overlayRef: OverlayRef | null = null;

  private readonly overlayConfig = new OverlayConfig({
    hasBackdrop: true,
    backdropClass: 'modal-backdrop-dark',
    panelClass: 'modal-panel',
    positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
    scrollStrategy: this.overlay.scrollStrategies.block(),
    maxWidth: '90vw',
    maxHeight: '90vh',
  });

  templates = signal<WhatsappTemplate[]>([]);
  selectedTemplate = signal<WhatsappTemplate | null>(null);
  params = signal<Record<string, string>>({});
  isLoading = signal(false);
  isSending = signal(false);

  bodyComponent = computed(
    () => this.selectedTemplate()?.components.find((c) => c.type === 'BODY') ?? null,
  );

  paramKeys = computed(() => {
    const body = this.bodyComponent();
    if (!body?.text) return [];
    const matches = body.text.match(/\{\{(\d+)\}\}/g) ?? [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))].sort();
  });

  preview = computed(() => {
    const body = this.bodyComponent();
    if (!body?.text) return '';
    let text = body.text;
    const p = this.params();
    for (const key of this.paramKeys()) {
      text = text.replaceAll(`{{${key}}}`, p[key] || `{{${key}}}`);
    }
    return text;
  });

  ngAfterViewInit(): void {
    if (this.isOpen) this.openModal();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen && this.portal) {
        this.openModal();
        this.reset();
        this.loadTemplates();
      } else if (!this.isOpen) {
        this.closeModalInternal();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.closeModalInternal();
  }

  private openModal(): void {
    if (!this.overlayRef) {
      this.overlayRef = this.overlay.create(this.overlayConfig);
      this.overlayRef
        .backdropClick()
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => this.closeModal());
      this.overlayRef
        .keydownEvents()
        .pipe(takeUntil(this.destroy$))
        .subscribe((e) => {
          if (e.key === 'Escape') this.closeModal();
        });
    }
    if (this.portal && !this.overlayRef.hasAttached()) {
      this.overlayRef.attach(this.portal);
    }
  }

  private closeModalInternal(): void {
    if (this.overlayRef) {
      this.overlayRef.detach();
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  onModalClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  private loadTemplates(): void {
    this.isLoading.set(true);
    this.chatService.getTemplates().subscribe({
      next: (list) => {
        const approved = list.filter((t) => t.status === 'APPROVED');
        this.templates.set(approved);
        this.isLoading.set(false);
        this.applyPrefill(approved);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading.set(false);
        this.notification.error('Erro ao carregar templates.');
        this.cdr.detectChanges();
      },
    });
  }

  private applyPrefill(templates: WhatsappTemplate[]): void {
    if (!this.prefillTemplateName) return;
    const match = templates.find((t) => t.name === this.prefillTemplateName);
    if (match) {
      this.selectedTemplate.set(match);
      this.params.set({ ...this.prefillParams });
    }
  }

  selectTemplate(template: WhatsappTemplate): void {
    this.selectedTemplate.set(template);
    this.params.set({});
  }

  setParam(key: string, value: string): void {
    this.params.update((p) => ({ ...p, [key]: value }));
  }

  getParam(key: string): string {
    return this.params()[key] ?? '';
  }

  canSend = computed(() => {
    if (!this.selectedTemplate()) return false;
    return this.paramKeys().every((k) => !!this.params()[k]?.trim());
  });

  send(): void {
    if (!this.canSend() || !this.conversationId || this.isSending()) return;

    const template = this.selectedTemplate()!;
    const p = this.params();

    const components: object[] = [];
    const bodyComp = this.bodyComponent();
    if (bodyComp && this.paramKeys().length > 0) {
      components.push({
        type: 'body',
        parameters: this.paramKeys().map((k) => ({ type: 'text', text: p[k] })),
      });
    }

    this.isSending.set(true);
    this.chatService.sendTemplate(this.conversationId, template.name, components, this.preview()).subscribe({
      next: () => {
        this.isSending.set(false);
        this.notification.success('Template enviado.');
        this.sent.emit();
        this.closeModal();
      },
      error: () => {
        this.isSending.set(false);
        this.notification.error('Erro ao enviar template.');
        this.cdr.detectChanges();
      },
    });
  }

  getComponentLabel(type: WhatsappTemplateComponent['type']): string {
    return (
      { HEADER: 'Cabeçalho', BODY: 'Corpo', FOOTER: 'Rodapé', BUTTONS: 'Botões' }[type] ?? type
    );
  }

  private reset(): void {
    this.templates.set([]);
    this.selectedTemplate.set(null);
    this.params.set({});
    this.isLoading.set(false);
    this.isSending.set(false);
  }
}
