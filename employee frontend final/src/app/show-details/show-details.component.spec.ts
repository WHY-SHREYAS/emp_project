import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShowDetailsComponent } from './show-details.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing'; // ✅ Add this
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('ShowDetailsComponent', () => {
  let component: ShowDetailsComponent;
  let fixture: ComponentFixture<ShowDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShowDetailsComponent],
      imports: [
        HttpClientTestingModule,  // ✅ For EmployeeService / HttpClient
        RouterTestingModule       // ✅ For routerLink directive
      ],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              params: { id: '1' },           // ✅ Mock param for ngOnInit
              queryParams: { q: 'test' },
              paramMap: { get: (key: string) => '1' }
            },
            params: of({ id: '1' }),          // ✅ Observable params
            queryParams: of({ q: 'test' })
          }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShowDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
