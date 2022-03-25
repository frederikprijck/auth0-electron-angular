import { Component, NgZone } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { Observable, Subject, switchMap, takeUntil } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'auth0-electron-angular';
  onDestroy$ = new Subject<void>();

  constructor(public authService: AuthService, private ngZone: NgZone) {}

  ngOnInit() {
    this.listenToElectron<string>('handleCallback')
      .pipe(
        switchMap((url) => this.authService.handleRedirectCallback(url)),
        takeUntil(this.onDestroy$)
      )
      .subscribe();

    this.listenToElectron<string>('logoutSuccess')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(() => {
        this.authService.logout({
          localOnly: true,
        });
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  login() {
    this.authService.buildAuthorizeUrl().subscribe((url) => {
      this.sendToElectron('login', url);
    });
  }

  logout() {
    this.authService
      .buildLogoutUrl({
        returnTo: 'http://localhost/logout',
      })
      .subscribe((url) => {
        this.sendToElectron('logout', url);
      });
  }

  getToken(ignoreCache: boolean) {
    this.authService
      .getAccessTokenSilently({ ignoreCache })
      .subscribe((token) => {
        console.log('token', token);
      });
  }

  // Helpers for Electron Communication between the Main Process and the Renderer Process
  private sendToElectron<T>(event: string, payload: T) {
    (window as any).require('electron').ipcRenderer.invoke(event, payload);
  }

  private listenToElectron<T>(event: string) {
    return new Observable<T>((observer) => {
      const listener = (_: any, payload: T) => {
        // Need to run this in the ngZone for Change Detection to pick up the changes
        this.ngZone.run(() => {
          observer.next(payload);
        });
      };
      (window as any).require('electron').ipcRenderer.on(event, listener);

      // Clean up listener when unsubscribing
      return () => {
        (window as any)
          .require('electron')
          .ipcRenderer.removeListener(event, listener);
      };
    });
  }
}
