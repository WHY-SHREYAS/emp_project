import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShowDetailsComponent } from './show-details.component';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ShowDetailsComponent', () => {
  let component: ShowDetailsComponent;
  let fixture: ComponentFixture<ShowDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ShowDetailsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            // Mock params or data based on your component’s usage
            params: of({ id: 1 }),
            queryParams: of({ q: 'test' }),
            snapshot: { paramMap: { get: (key: string) => '1' } }
          }
        }
      ]
    });

    fixture = TestBed.createComponent(ShowDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
