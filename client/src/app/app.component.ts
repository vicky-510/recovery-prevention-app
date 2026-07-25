import { Component, inject } from '@angular/core';
import { AuthService } from './core/auth.service';
import { LoginComponent } from './components/login.component';
import { CrisisComponent } from './components/crisis.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LoginComponent, CrisisComponent],
  template: `
    @if (auth.isAuthenticated()) {
      <app-crisis />
    } @else {
      <app-login />
    }
  `,
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
}
