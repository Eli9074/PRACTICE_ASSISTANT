import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArpeggioCenter } from './arpeggio-center';

describe('ArpeggioCenter', () => {
  let component: ArpeggioCenter;
  let fixture: ComponentFixture<ArpeggioCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArpeggioCenter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArpeggioCenter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
