import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // ✅ Needed if component uses forms
import { RouterTestingModule } from '@angular/router/testing';      // ✅ Needed if component uses routing
import { UpdateEmployeeComponent } from './update-employee.component';

describe('UpdateEmployeeComponent', () => {
  let component: UpdateEmployeeComponent;
  let fixture: ComponentFixture<UpdateEmployeeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [UpdateEmployeeComponent],
      imports: [
        HttpClientTestingModule,  // ✅ HttpClient dependency
        FormsModule,              // ✅ Template-driven forms
        ReactiveFormsModule,      // ✅ Reactive forms (if used)
        RouterTestingModule       // ✅ Routing
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateEmployeeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
