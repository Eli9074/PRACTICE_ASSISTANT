import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranscribingPage } from './transcribing-page';

describe('TranscribingPage', () => {
  let component: TranscribingPage;
  let fixture: ComponentFixture<TranscribingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranscribingPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TranscribingPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
