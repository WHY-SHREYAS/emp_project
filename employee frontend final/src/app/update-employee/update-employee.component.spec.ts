import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router'; // ✅ Import ActivatedRoute
import { of } from 'rxjs'; // ✅ Import 'of' from rxjs
import { UpdateEmployeeComponent } from './update-employee.component';

describe('UpdateEmployeeComponent', () => {
  let component: UpdateEmployeeComponent;
  let fixture: ComponentFixture<UpdateEmployeeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateEmployeeComponent],
      imports: [
        HttpClientTestingModule, // ✅ For EmployeeService / HttpClient
        FormsModule              // ✅ For template-driven forms
      ],
      providers: [
        {
          provide: ActivatedRoute, // ✅ Mock ActivatedRoute
          useValue: {
            params: of({ id: '1' }), // Mock params observable
            snapshot: {
              params: { id: '1' }    // Mock snapshot params
            }
          }
        }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UpdateEmployeeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
