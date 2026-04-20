# Thinking Indicator Component

A reusable "thinking" indicator component that displays an animated spinner to indicate the application is processing or waiting for a response.

## Features

- Simple animated spinner without text
- Configurable size
- Can be displayed inline or as an overlay
- Consistent with Material Design patterns

## Usage

### 1. Import the Module

Add `ThinkingIndicatorModule` to your module's imports:

```typescript
import { ThinkingIndicatorModule } from './shared/components/thinking-indicator/thinking-indicator.component.module';

@NgModule({
  imports: [
    // ... other imports
    ThinkingIndicatorModule
  ]
})
export class YourModule { }
```

### 2. Use in Template

#### Basic Usage (Inline)
```html
<app-thinking-indicator *ngIf="isProcessing"></app-thinking-indicator>
```

#### Custom Size
```html
<app-thinking-indicator 
  *ngIf="isProcessing" 
  [size]="60">
</app-thinking-indicator>
```

#### As Overlay (Full Screen)
```html
<app-thinking-indicator 
  *ngIf="isProcessing" 
  [overlay]="true">
</app-thinking-indicator>
```

### 3. Component Example

```typescript
export class MyComponent {
  isProcessing: boolean = false;

  async performAction() {
    this.isProcessing = true;
    
    try {
      // Perform async operation
      await this.someService.doSomething();
    } finally {
      this.isProcessing = false;
    }
  }
}
```

```html
<div class="container">
  <button (click)="performAction()">Do Something</button>
  
  <app-thinking-indicator 
    *ngIf="isProcessing"
    [overlay]="true">
  </app-thinking-indicator>
</div>
```

## Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `size` | `number` | `40` | Diameter of the spinner in pixels |
| `overlay` | `boolean` | `false` | If true, displays as a full-screen overlay with semi-transparent background |

## Styling

The component uses Material Angular's `mat-spinner` component for the animation. The spinner inherits the primary color from your Material theme.

### Inline Display
- Centered within its container
- 16px padding around the spinner
- Flexible display for easy integration

### Overlay Display
- Fixed position covering entire viewport
- Semi-transparent black background (rgba(0, 0, 0, 0.3))
- z-index: 9999 to appear above other content
- Spinner centered on screen

## Examples

### In a Form Submission
```html
<form (ngSubmit)="onSubmit()">
  <!-- form fields -->
  <button type="submit" [disabled]="isSubmitting">Submit</button>
</form>

<app-thinking-indicator *ngIf="isSubmitting"></app-thinking-indicator>
```

### During Data Loading
```html
<div class="data-container">
  <div *ngIf="!isLoading">
    <!-- display data -->
  </div>
  
  <app-thinking-indicator *ngIf="isLoading"></app-thinking-indicator>
</div>
```

### As Global Processing Indicator
```html
<!-- In app.component.html or layout component -->
<app-thinking-indicator 
  *ngIf="globalProcessingService.isProcessing$ | async"
  [overlay]="true">
</app-thinking-indicator>
```
