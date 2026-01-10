import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalCenter } from './goal-center';

describe('GoalCenter', () => {
  let component: GoalCenter;
  let fixture: ComponentFixture<GoalCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalCenter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalCenter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
